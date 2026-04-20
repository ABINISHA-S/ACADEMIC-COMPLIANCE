import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Assignment, Submission } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Clock, FileText, AlertCircle, FileUp, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

export default function StudentDashboard({ profile }: { profile: UserProfile }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileData, setFileData] = useState<string | null>(null);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [viewSubmission, setViewSubmission] = useState<Submission | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const [assignmentsRes, submissionsRes] = await Promise.all([
        fetch('/api/assignments'),
        fetch('/api/submissions')
      ]);
      const assignmentsData = await assignmentsRes.json();
      const submissionsData = await submissionsRes.json();
      
      setAssignments(assignmentsData);
      setMySubmissions(submissionsData.filter((s: Submission) => s.studentId === profile.uid));
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    
    // Exact file preserving
    const dataReader = new FileReader();
    dataReader.onload = (event) => {
      setFileData(event.target?.result as string);
    };
    dataReader.readAsDataURL(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setSubmissionContent(content);
    };
    
    if (file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.rtf') || file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      setSubmissionContent(`[Content extracted from ${file.name}]\n\n[System Note: The student uploaded a non-text binary file. Providing manual download link for the teacher].\n\n(Simulated extraction of document content)`);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAssignment || !submissionContent) {
      toast.error('Please upload a document first');
      return;
    }

    try {
      await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: selectedAssignment.id,
          studentId: profile.uid,
          studentName: profile.displayName,
          content: submissionContent,
          fileName: fileName,
          fileData: fileData,
          status: 'PENDING',
          submittedAt: Date.now(),
          version: 1,
        }),
      });

      setIsSubmitOpen(false);
      setSubmissionContent('');
      setFileName(null);
      fetchData();
      toast.success('Assignment submitted successfully');
    } catch (error) {
      toast.error('Failed to submit assignment');
    }
  };

  const compliantCount = mySubmissions.filter(s => s.status === 'COMPLIANT').length;
  const nonCompliantCount = mySubmissions.filter(s => s.status === 'NON-COMPLIANT').length;
  const complianceRate = mySubmissions.length > 0 ? Math.round((compliantCount / mySubmissions.length) * 100) : 0;

  if (viewSubmission) {
    const assignment = assignments.find(a => a.id === viewSubmission.assignmentId);
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <Button variant="ghost" className="mb-2 -ml-4 hover:bg-transparent text-muted-foreground hover:text-foreground" onClick={() => setViewSubmission(null)}>
              &larr; Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Your Submission</h1>
            <p className="text-muted-foreground mt-1">{assignment?.title} &bull; Submitted {new Date(viewSubmission.submittedAt).toLocaleString()}</p>
          </div>
          <div className="flex gap-4 items-center">
            <Badge variant="outline" className="text-sm px-4 py-2 uppercase tracking-wider">
               Status: {viewSubmission.status}
            </Badge>
          </div>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2 border shadow-sm flex flex-col h-full bg-white">
            <CardHeader className="border-b bg-muted/30 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-500" />
                Document Content
              </CardTitle>
              <Badge variant="secondary" className="font-normal text-xs uppercase tracking-wider px-3 py-1">
                {viewSubmission.content.split(/\s+/).filter(w => w.length > 0).length} words
              </Badge>
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
                    <CheckCircle className="h-5 w-5" />
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Compliance Status</h1>
        <p className="text-muted-foreground mt-1">Compliance of student assignment submissions against due dates and teacher review status</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border shadow-sm">
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold mb-1">{mySubmissions.length}</div>
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Upcoming Assignments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignments.filter(a => new Date(a.deadline) > new Date()).map(assignment => (
              <div key={assignment.id} className="p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold">{assignment.title}</h3>
                  <Badge variant="outline">{assignment.section}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{assignment.description}</p>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(assignment.deadline).toLocaleDateString()}
                  </div>
                  {assignment.formattingRules?.minWordCount && (
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {assignment.formattingRules.minWordCount}-{assignment.formattingRules.maxWordCount} words
                    </div>
                  )}
                </div>
              </div>
            ))}
            {assignments.filter(a => new Date(a.deadline) > new Date()).length === 0 && (
              <p className="text-center py-8 text-muted-foreground italic">No upcoming assignments.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold">My Submissions</CardTitle>
            <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
            <DialogTrigger 
              render={
                <Button className="bg-primary hover:bg-primary/90">
                  <FileUp className="mr-2 h-4 w-4" />
                  New Submission
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>New Submission</DialogTitle>
                <DialogDescription>
                  Select an assignment and upload your document.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Assignment</label>
                  <select 
                    className="w-full p-2 border rounded-md"
                    onChange={(e) => setSelectedAssignment(assignments.find(a => a.id === e.target.value) || null)}
                  >
                    <option value="">Choose an assignment...</option>
                    {assignments.map(a => (
                      <option key={a.id} value={a.id}>{a.title}</option>
                    ))}
                  </select>
                </div>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 p-12 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    accept=".pdf,.doc,.docx,.txt,.rtf"
                    onChange={handleFileChange}
                  />
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 group-hover:scale-110 transition-transform">
                    <FileUp className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">
                    {fileName ? fileName : 'Click to upload document'}
                  </h3>
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full" disabled={!fileName || !selectedAssignment}>
                Submit for Compliance Check
              </Button>
            </DialogContent>
          </Dialog>
        </CardHeader>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {mySubmissions.map((submission) => {
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
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`
                          ${submission.status === 'PENDING' ? 'bg-muted text-muted-foreground border-border' : 
                            submission.status === 'COMPLIANT' ? 'bg-green-500/10 text-green-600 border-green-200/50' : 
                            'bg-destructive/10 text-destructive border-destructive/20'}
                        `}>
                          <Clock className="mr-1 h-3 w-3" />
                          {submission.status === 'PENDING' ? 'Pending' : 
                           submission.status === 'COMPLIANT' ? 'Compliant' : 'Non-compliant'}
                        </Badge>
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
              {mySubmissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No submissions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>

    </div>
  );
}
