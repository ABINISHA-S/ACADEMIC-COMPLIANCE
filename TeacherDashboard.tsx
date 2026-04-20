import React, { useState, useEffect } from 'react';
import { UserProfile, Assignment, Submission } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, BookOpen, Users, Clock, FileText, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { evaluateSubmission } from '../lib/gemini';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

export default function TeacherDashboard({ profile, initialCreateOpen = false }: { profile: UserProfile, initialCreateOpen?: boolean }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(initialCreateOpen);
  const [viewSubmission, setViewSubmission] = useState<Submission | null>(null);
  const [selectedFilterAssignmentId, setSelectedFilterAssignmentId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('submissions');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    section: '',
    grade: '',
    deadline: '',
    fontSize: 12,
    margins: '1 inch',
    lineSpacing: 1.5,
    minWordCount: 500,
    maxWordCount: 2000,
  });

  const fetchData = async () => {
    try {
      const [assignmentsRes, submissionsRes] = await Promise.all([
        fetch('/api/assignments'),
        fetch('/api/submissions')
      ]);
      const assignmentsData = await assignmentsRes.json();
      const submissionsData = await submissionsRes.json();
      
      setAssignments(assignmentsData.filter((a: Assignment) => a.teacherId === profile.uid));
      setSubmissions(submissionsData);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [profile.uid]);

  useEffect(() => {
    if (initialCreateOpen) {
      setIsCreateOpen(true);
    }
  }, [initialCreateOpen]);

  useEffect(() => {
    if (viewSubmission?.fileData && viewSubmission.fileData.includes('base64,')) {
      try {
        const parts = viewSubmission.fileData.split(',');
        const mimeString = parts[0].split(':')[1].split(';')[0];
        const byteString = atob(parts[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        const objUrl = URL.createObjectURL(blob);
        setPreviewUrl(objUrl);
        return () => URL.revokeObjectURL(objUrl);
      } catch (err) {
        setPreviewUrl(null);
      }
    } else {
      setPreviewUrl(null);
    }
  }, [viewSubmission]);

  const handleCreateAssignment = async () => {
    try {
      if (!newAssignment.title || !newAssignment.description) {
        toast.error('Please fill in all required fields');
        return;
      }

      await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAssignment,
          teacherId: profile.uid,
          teacherName: profile.displayName,
          deadline: new Date(newAssignment.deadline).getTime(),
          formattingRules: {
            fontSize: newAssignment.fontSize,
            margins: newAssignment.margins,
            lineSpacing: newAssignment.lineSpacing,
            minWordCount: newAssignment.minWordCount,
            maxWordCount: newAssignment.maxWordCount,
            headingStructure: true,
            citationStyle: 'APA',
          },
          createdAt: Date.now(),
        }),
      });

      setIsCreateOpen(false);
      fetchData();
      toast.success('Assignment created successfully');
    } catch (error) {
      toast.error('Failed to create assignment');
    }
  };

  const handleGradeSubmission = async (submission: Submission, status: 'COMPLIANT' | 'NON-COMPLIANT') => {
    try {
      toast.info('AI is evaluating the submission...');
      
      const assignment = assignments.find(a => a.id === submission.assignmentId);
      if (!assignment) return;

      const otherSubmissions = submissions
        .filter(s => s.assignmentId === submission.assignmentId && s.id !== submission.id)
        .map(s => s.content);

      const evaluation = await evaluateSubmission(submission.content, assignment, otherSubmissions);
      
      // Restrict grade to allowed values
      const allowedGrades = ['A', 'A+', 'B', 'B+', 'C'];
      if (!allowedGrades.includes(evaluation.overallGrade)) {
        evaluation.overallGrade = 'B'; // Default fallback
      }

      await fetch(`/api/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, evaluation }),
      });
      
      fetchData();
      toast.success(`Submission marked as ${status}`);
    } catch (error) {
      toast.error('Failed to grade submission');
    }
  };

  const compliantCount = submissions.filter(s => s.status === 'COMPLIANT').length;
  const nonCompliantCount = submissions.filter(s => s.status === 'NON-COMPLIANT').length;
  const complianceRate = submissions.length > 0 ? Math.round((compliantCount / submissions.length) * 100) : 0;

  const handleDownload = (submission: Submission) => {
    let url: string = '';
    let isBlobUrl = false;
    let finalFileName = submission.fileName || `${submission.studentName.replace(/\s+/g, '_')}_submission.txt`;

    if (submission.fileData && submission.fileData.includes('base64,')) {
      try {
        // Direct exact file reconstruction from natively encoded base64 format without hitting URL max-length limits
        const parts = submission.fileData.split(',');
        const mimeString = parts[0].split(':')[1].split(';')[0];
        const byteString = atob(parts[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        url = URL.createObjectURL(blob);
        isBlobUrl = true;
      } catch (err) {
        console.error("Base64 parsing failed", err);
        url = submission.fileData;
      }
    } else {
      // Fallback for older legacy text submissions
      const blob = new Blob([submission.content], { type: 'text/plain' });
      url = URL.createObjectURL(blob);
      isBlobUrl = true;
      
      // Force .txt extension if it's the raw fallback text so Word doesn't crash reading a plain-text file
      if (!finalFileName.endsWith('.txt')) {
        finalFileName = finalFileName + '.txt';
      }
    }
    
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    if (isBlobUrl) {
      URL.revokeObjectURL(url);
    }
    toast.success('Exact file downloaded successfully');
  };

  if (viewSubmission) {
    const assignment = assignments.find(a => a.id === viewSubmission.assignmentId);
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <Button variant="ghost" className="mb-2 -ml-4 hover:bg-transparent text-muted-foreground hover:text-foreground" onClick={() => setViewSubmission(null)}>
              &larr; Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Review: {viewSubmission.studentName}</h1>
            <p className="text-muted-foreground mt-1">{assignment?.title} &bull; Submitted {new Date(viewSubmission.submittedAt).toLocaleString()}</p>
          </div>
          <div className="flex gap-4 items-center">
             {viewSubmission.status === 'PENDING' ? (
                <>
                  <Button size="lg" onClick={() => handleGradeSubmission(viewSubmission, 'COMPLIANT')} className="bg-green-600 hover:bg-green-700">Approve</Button>
                  <Button size="lg" onClick={() => handleGradeSubmission(viewSubmission, 'NON-COMPLIANT')} variant="destructive">Reject</Button>
                </>
             ) : (
                <Badge variant="outline" className="text-sm px-4 py-2 uppercase tracking-wider">
                  Status: {viewSubmission.status}
                </Badge>
             )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2 border shadow-sm flex flex-col h-full bg-white">
            <CardHeader className="border-b bg-muted/30 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-500" />
                Document Content
              </CardTitle>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="font-normal text-xs uppercase tracking-wider px-3 py-1">
                  {viewSubmission.content.split(/\s+/).filter(w => w.length > 0).length} words
                </Badge>
                <Button variant="outline" size="sm" onClick={() => handleDownload(viewSubmission)}>
                  Download
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto rounded-b-lg">
               {previewUrl && viewSubmission?.fileName?.toLowerCase().endsWith('.pdf') ? (
                 <iframe src={previewUrl} className="w-full h-full min-h-[700px] border-0 bg-muted/20" title="Document Preview" />
               ) : previewUrl && viewSubmission?.fileName?.match(/\.(jpeg|jpg|png|gif)$/i) ? (
                 <div className="flex items-center justify-center p-8 min-h-[600px] bg-[#fdfbf7]">
                   <img src={previewUrl} alt="Document Preview" className="max-w-full max-h-[800px] object-contain shadow-md rounded" />
                 </div>
               ) : (
                 <div className="p-8 sm:p-12 font-serif leading-loose text-lg min-h-[600px] whitespace-pre-wrap bg-[#fdfbf7] text-slate-800 shadow-inner">
                   {viewSubmission?.content}
                 </div>
               )}
            </CardContent>
          </Card>
          
          <div className="space-y-6">
            <Card className="border shadow-sm bg-white overflow-hidden">
              <CardHeader className="border-b bg-primary/5 py-4">
                 <CardTitle className="text-lg flex items-center gap-2 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                    AI Evaluation
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                 {viewSubmission.evaluation ? (
                   <div className="divide-y">
                     <div className="p-6 flex justify-between items-end bg-primary/5">
                       <div>
                         <p className="text-xs text-primary/70 font-bold uppercase tracking-wider">Overall Grade</p>
                         <p className="text-6xl font-black text-primary mt-1 leading-none">{viewSubmission.evaluation.overallGrade}</p>
                       </div>
                       <div className="text-right">
                         <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Grammar</p>
                         <p className="text-3xl font-bold">{viewSubmission.evaluation.grammarScore}%</p>
                       </div>
                     </div>
                     <div className="p-6 bg-amber-50/50">
                        <p className="text-xs font-bold mb-3 uppercase tracking-wider text-amber-800/60">Detailed Feedback</p>
                        <p className="text-sm text-slate-700 italic bg-white p-4 rounded-lg border border-amber-100 shadow-sm leading-relaxed">
                          "{viewSubmission.evaluation.feedback}"
                        </p>
                     </div>
                     <div className="grid grid-cols-3 gap-px bg-border">
                        <div className="p-4 bg-white text-center">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Structure</p>
                          <p className="font-semibold text-lg">{viewSubmission.evaluation.structureScore}%</p>
                        </div>
                        <div className="p-4 bg-white text-center">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Relevance</p>
                          <p className="font-semibold text-lg">{viewSubmission.evaluation.relevanceScore}%</p>
                        </div>
                        <div className="p-4 bg-white text-center">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Plagiarism</p>
                          <p className="font-semibold text-lg text-rose-600">{viewSubmission.evaluation.plagiarismScore}%</p>
                        </div>
                     </div>
                   </div>
                 ) : (
                   <div className="text-center py-16 text-muted-foreground">
                      <p className="italic">AI evaluation pending or unavailable.</p>
                   </div>
                 )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Compliance Status</h1>
          <p className="text-muted-foreground mt-1">Compliance of student assignment submissions against due dates and teacher review status</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger 
            render={
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-5 w-5" />
                New Assignment
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Create New Assignment</DialogTitle>
              <DialogDescription>
                Set the details and formatting rules for your students.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Title</label>
                <Input 
                  placeholder="e.g. History of AI" 
                  value={newAssignment.title}
                  onChange={e => setNewAssignment({...newAssignment, title: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea 
                  placeholder="Describe the assignment goals..." 
                  value={newAssignment.description}
                  onChange={e => setNewAssignment({...newAssignment, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Section</label>
                  <Input 
                    placeholder="e.g. A" 
                    value={newAssignment.section}
                    onChange={e => setNewAssignment({...newAssignment, section: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Grade/Standard</label>
                  <Input 
                    placeholder="e.g. 10th" 
                    value={newAssignment.grade}
                    onChange={e => setNewAssignment({...newAssignment, grade: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Deadline</label>
                <Input 
                  type="datetime-local" 
                  value={newAssignment.deadline}
                  onChange={e => setNewAssignment({...newAssignment, deadline: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Min Word Count</label>
                  <Input 
                    type="number" 
                    placeholder="e.g. 500" 
                    value={newAssignment.minWordCount}
                    onChange={e => setNewAssignment({...newAssignment, minWordCount: parseInt(e.target.value)})}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Max Word Count</label>
                  <Input 
                    type="number" 
                    placeholder="e.g. 2000" 
                    value={newAssignment.maxWordCount}
                    onChange={e => setNewAssignment({...newAssignment, maxWordCount: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            </div>
            <Button onClick={handleCreateAssignment} className="w-full">Create Assignment</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border shadow-sm">
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold mb-1">{submissions.length}</div>
            <p className="text-sm text-muted-foreground font-medium">Total Submissions</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold mb-1 text-green-600">{compliantCount}</div>
            <p className="text-sm text-muted-foreground font-medium">Compliant (On-time Approved)</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold mb-1 text-destructive">{nonCompliantCount}</div>
            <p className="text-sm text-muted-foreground font-medium">Non-compliant / Overdue</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold mb-1">{complianceRate}%</div>
            <p className="text-sm text-muted-foreground font-medium">Compliance Rate</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="assignments">My Assignments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="submissions" className="mt-6">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Filter by Assignment</label>
              <select 
                className="w-full p-2 border rounded-md bg-background text-sm"
                value={selectedFilterAssignmentId}
                onChange={(e) => setSelectedFilterAssignmentId(e.target.value)}
              >
                <option value="all">All Assignments</option>
                {assignments.map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>
            {selectedFilterAssignmentId !== 'all' && (
              <Button variant="ghost" size="sm" className="mt-5" onClick={() => setSelectedFilterAssignmentId('all')}>
                Clear Filter
              </Button>
            )}
          </div>
          <Card className="border shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Student</TableHead>
                    <TableHead className="font-semibold">Assignment</TableHead>
                    <TableHead className="font-semibold">Course</TableHead>
                    <TableHead className="font-semibold">Due Date</TableHead>
                    <TableHead className="font-semibold">Submitted</TableHead>
                    <TableHead className="font-semibold">Review Status</TableHead>
                    <TableHead className="font-semibold">Compliance</TableHead>
                    <TableHead className="font-semibold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions
                    .filter(s => selectedFilterAssignmentId === 'all' || s.assignmentId === selectedFilterAssignmentId)
                    .map((submission) => {
                    const assignment = assignments.find(a => a.id === submission.assignmentId);
                    return (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">{submission.studentName}</TableCell>
                        <TableCell>{assignment?.title || '-'}</TableCell>
                        <TableCell>{assignment?.section || '-'}</TableCell>
                        <TableCell>{assignment ? new Date(assignment.deadline).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>{new Date(submission.submittedAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`
                            ${submission.status === 'PENDING' ? 'bg-amber-500/10 text-amber-600 border-amber-200/50' : 'bg-green-500/10 text-green-600 border-green-200/50'}
                          `}>
                            <Clock className="mr-1 h-3 w-3" />
                            {submission.status === 'PENDING' ? 'Pending' : 'Reviewed'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`
                            ${submission.status === 'PENDING' ? 'bg-muted text-muted-foreground border-border' : 
                              submission.status === 'COMPLIANT' ? 'bg-green-500/10 text-green-600 border-green-200/50' : 
                              'bg-destructive/10 text-destructive border-destructive/20'}
                          `}>
                            <Clock className="mr-1 h-3 w-3" />
                            {submission.status === 'PENDING' ? 'Pending' : 
                             submission.status === 'COMPLIANT' ? 'Compliant' : 'Non-compliant'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {submission.status === 'PENDING' ? (
                              <>
                                <Button size="sm" onClick={() => handleGradeSubmission(submission, 'COMPLIANT')}>
                                  Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleGradeSubmission(submission, 'NON-COMPLIANT')}>
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="text-xs font-bold">Grade: {submission.evaluation?.overallGrade}</span>
                                <Button size="sm" variant="outline">Report</Button>
                              </>
                            )}
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              className="flex items-center gap-2"
                              onClick={() => setViewSubmission(submission)}
                            >
                              <FileText className="h-4 w-4" />
                              View
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {submissions
                    .filter(s => selectedFilterAssignmentId === 'all' || s.assignmentId === selectedFilterAssignmentId)
                    .length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        No submissions found for this selection.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignments.map(assignment => (
              <Card key={assignment.id} className="border shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-primary/5">{assignment.grade} - {assignment.section}</Badge>
                    <Badge variant="secondary" className={new Date(assignment.deadline) > new Date() ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-700'}>
                      {new Date(assignment.deadline) > new Date() ? 'Active' : 'Ended'}
                    </Badge>
                  </div>
                  <CardTitle className="mt-2">{assignment.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Clock className="mr-1 h-3 w-3" />
                      {new Date(assignment.deadline).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <Users className="mr-1 h-3 w-3" />
                      {submissions.filter(s => s.assignmentId === assignment.id).length} Submissions
                    </div>
                  </div>
                  {assignment.formattingRules?.minWordCount && (
                    <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      <span>{assignment.formattingRules.minWordCount} - {assignment.formattingRules.maxWordCount} words</span>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-4"
                    onClick={() => {
                      setSelectedFilterAssignmentId(assignment.id);
                      setActiveTab('submissions');
                    }}
                  >
                    View Submissions
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

    </div>
  );
}
