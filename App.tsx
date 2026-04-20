import React, { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from 'next-themes';
import { UserProfile, UserRole } from './types';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Badge } from './components/ui/badge';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { 
  LogIn, 
  LogOut, 
  GraduationCap, 
  Sun, 
  Moon, 
  LayoutDashboard, 
  FileText, 
  ClipboardList, 
  ShieldCheck, 
  Users, 
  BookOpen,
  Search,
  CheckSquare,
  Plus
} from 'lucide-react';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import { motion, AnimatePresence } from 'motion/react';
import { SITE_TITLE } from './site';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="rounded-full hover:bg-muted"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-indigo-400" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

function Sidebar({ profile, onLogout, activeTab, setActiveTab }: { 
  profile: UserProfile | null, 
  onLogout: () => void, 
  activeTab: string,
  setActiveTab: (tab: string) => void
}) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'assignments', label: 'Assignments', icon: ClipboardList },
    ...(profile?.role === 'TEACHER' ? [{ id: 'add-assignment', label: 'Add Assignment', icon: Plus }] : []),
    { id: 'students', label: 'Students', icon: Users },
    { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
  ];

  return (
    <aside className="w-64 sidebar-gradient text-white flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-white/10 p-2 rounded-lg">
          <GraduationCap className="h-6 w-6" />
        </div>
        <span className="font-bold text-lg leading-tight">{SITE_TITLE}</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.slice(0, -1).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === item.id 
                ? 'bg-white/10 text-white shadow-sm' 
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="px-4 pb-4">
        <button
          onClick={() => setActiveTab('compliance')}
          className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${
            activeTab === 'compliance' 
              ? 'bg-primary text-white shadow-xl scale-[1.02]' 
              : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
          }`}
        >
          <ShieldCheck className="h-6 w-6" />
          <span className="font-bold text-lg">Compliance</span>
        </button>
      </div>

      <div className="p-4 border-t border-white/10 space-y-4">
        <div className="flex items-center gap-3 px-4">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
            <span className="font-bold">{profile?.displayName?.[0]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{profile?.displayName}</p>
            <p className="text-[10px] text-white/50">{profile?.role}</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-white/60 hover:text-white hover:bg-white/5"
          onClick={onLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}

function AppContent() {
  const [user, setUser] = useState<{ uid: string; email: string; displayName: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'STUDENT' as UserRole
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('mock_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      fetchProfile(parsed.uid);
    } else {
      setLoading(false);
    }
  }, []);

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    if (profile) {
      Promise.all([
        fetch('/api/submissions').then(res => res.json()),
        fetch('/api/users').then(res => res.json()),
        fetch('/api/assignments').then(res => res.json())
      ]).then(([subs, usrs, asgn]) => {
        setSubmissions(subs);
        setUsersList(usrs);
        setAssignments(asgn);
      }).catch(err => console.error(err));
    }
  }, [profile]);

  const handleLogout = () => {
    localStorage.removeItem('mock_user');
    setUser(null);
    setProfile(null);
    toast.success('Logged out');
  };

  const fetchProfile = async (uid: string) => {
    try {
      const res = await fetch(`/api/users/${uid}`);
      const data = await res.json();
      if (data) {
        setProfile(data);
      } else {
        handleLogout();
      }
    } catch (error) {
      console.error(error);
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!authForm.email || !authForm.password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const email = authForm.email.trim();
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: authForm.password })
      });
      if (!res.ok) {
        throw new Error('Invalid email or password');
      }
      const data = await res.json();
      const mockUser = { uid: data.uid, email: data.email, displayName: data.displayName };
      localStorage.setItem('mock_user', JSON.stringify(mockUser));
      setUser(mockUser);
      setProfile(data);
      toast.success('Logged in successfully');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!authForm.email || !authForm.password || !authForm.displayName) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const email = authForm.email.trim();
      const uid = 'user_' + Math.random().toString(36).substr(2, 9);
      const newProfile = {
        uid,
        email,
        password: authForm.password,
        displayName: authForm.displayName,
        role: authForm.role,
        createdAt: Date.now(),
      };

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile),
      });

      if (!res.ok) {
        throw new Error('Registration failed');
      }

      const returnedUser = await res.json();
      const mockUser = { uid: returnedUser.uid, email: returnedUser.email, displayName: returnedUser.displayName };
      localStorage.setItem('mock_user', JSON.stringify(mockUser));
      setUser(mockUser);
      setProfile(returnedUser);
      toast.success('Account created successfully');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen landing-gradient flex items-center justify-center p-6">
        <div className="container max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-white space-y-8"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-3 rounded-xl">
                <GraduationCap className="h-8 w-8" />
              </div>
              <span className="text-2xl font-bold">{SITE_TITLE}</span>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-5xl font-bold leading-tight">
                Automated Academic Compliance Checker
              </h1>
              <p className="text-xl text-white/70 max-w-lg">
                Streamline degree requirement tracking, document reviews, and compliance monitoring — all in one place.
              </p>
            </div>

            <div className="flex gap-8 pt-4">
              <div className="flex items-center gap-2 text-white/80">
                <BookOpen className="h-5 w-5" />
                <span>Course Tracking</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <Users className="h-5 w-5" />
                <span>Document Review</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="w-full max-w-md mx-auto border-none shadow-2xl p-8">
              <AnimatePresence mode="wait">
                {authMode === 'login' ? (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <CardHeader className="text-center p-0">
                      <CardTitle className="text-3xl font-bold">Sign In</CardTitle>
                      <CardDescription className="text-base mt-2">
                        Enter your credentials to continue
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <Input 
                          placeholder="you@university.edu" 
                          className="h-12 bg-slate-50 border-none" 
                          value={authForm.email}
                          onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Password</label>
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          className="h-12 bg-slate-50 border-none" 
                          value={authForm.password}
                          onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                        />
                      </div>
                      <Button onClick={handleLogin} className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90" size="lg">
                        Sign In
                      </Button>
                      <div className="text-center">
                        <button 
                          onClick={() => setAuthMode('signup')}
                          className="text-primary hover:underline text-sm font-medium"
                        >
                          Don't have an account? Sign up
                        </button>
                      </div>
                    </CardContent>
                  </motion.div>
                ) : (
                  <motion.div
                    key="signup"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <CardHeader className="text-center p-0">
                      <CardTitle className="text-3xl font-bold">Create Account</CardTitle>
                      <CardDescription className="text-base mt-2">
                        Join our academic community
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Full Name</label>
                        <Input 
                          placeholder="John Doe" 
                          className="h-12 bg-slate-50 border-none" 
                          value={authForm.displayName}
                          onChange={(e) => setAuthForm({...authForm, displayName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <Input 
                          placeholder="you@university.edu" 
                          className="h-12 bg-slate-50 border-none" 
                          value={authForm.email}
                          onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Password</label>
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          className="h-12 bg-slate-50 border-none" 
                          value={authForm.password}
                          onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Role</label>
                        <select 
                          className="w-full h-12 bg-slate-50 border-none rounded-md px-3 text-sm"
                          value={authForm.role}
                          onChange={(e) => setAuthForm({...authForm, role: e.target.value as UserRole})}
                        >
                          <option value="STUDENT">Student</option>
                          <option value="TEACHER">Teacher</option>
                        </select>
                      </div>
                      <Button onClick={handleSignUp} className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90" size="lg">
                        Sign Up
                      </Button>
                      <div className="text-center">
                        <button 
                          onClick={() => setAuthMode('login')}
                          className="text-primary hover:underline text-sm font-medium"
                        >
                          Already have an account? Sign in
                        </button>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar 
        profile={profile} 
        onLogout={handleLogout} 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4 bg-muted px-4 py-2 rounded-xl w-96">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input 
              placeholder="Search documents, assignments..." 
              className="bg-transparent border-none focus:ring-0 text-sm w-full text-foreground"
            />
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </header>

        <div className="p-8 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + profile?.role}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' || activeTab === 'compliance' ? (
                <>
                  {profile?.role === 'TEACHER' && <TeacherDashboard profile={profile} />}
                  {profile?.role === 'STUDENT' && <StudentDashboard profile={profile} />}
                </>
              ) : activeTab === 'documents' ? (
                <div className="space-y-6">
                  <h1 className="text-3xl font-bold">Documents</h1>
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Documents</CardTitle>
                      <CardDescription>View and manage all uploaded documents.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {submissions
                        .filter(s => profile?.role === 'TEACHER' || s.studentId === profile?.uid)
                        .sort((a, b) => b.submittedAt - a.submittedAt)
                        .map(s => {
                          const asgn = assignments.find(a => a.id === s.assignmentId);
                          return (
                            <div key={s.id} className="flex flex-col sm:flex-row items-center justify-between p-4 border rounded-lg bg-card/50 gap-4">
                              <div className="flex items-start gap-4">
                                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                                  <FileText className="h-6 w-6" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-lg">{asgn?.title || 'Unknown Assignment'}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    Submitted by: {s.studentName} &bull; {new Date(s.submittedAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant={s.status === 'COMPLIANT' ? 'default' : 'secondary'}>
                                  {s.status}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      {submissions.length === 0 && (
                        <p className="text-muted-foreground italic text-center py-8">No documents found.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : activeTab === 'assignments' ? (
                <div className="space-y-6">
                  <h1 className="text-3xl font-bold">Assignments</h1>
                  <Card>
                    <CardHeader>
                      <CardTitle>Active Assignments</CardTitle>
                      <CardDescription>Track all current and upcoming assignments.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {assignments
                        .filter(a => profile?.role === 'STUDENT' || a.teacherId === profile?.uid)
                        .sort((a, b) => b.createdAt - a.createdAt)
                        .map(a => (
                          <div key={a.id} className="flex flex-col sm:flex-row items-center justify-between p-4 border rounded-lg bg-card/50 gap-4">
                            <div className="flex items-start gap-4">
                              <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                                <ClipboardList className="h-6 w-6" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">{a.title}</h3>
                                <p className="text-sm text-muted-foreground max-w-lg truncate">{a.description}</p>
                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">Teacher:</span> {a.teacherName}
                                  <span>&bull;</span>
                                  <span className="font-medium text-foreground">Due:</span> {new Date(a.deadline).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">View Details</Button>
                          </div>
                      ))}
                      {assignments.length === 0 && (
                        <p className="text-muted-foreground italic text-center py-8">No active assignments.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : activeTab === 'add-assignment' ? (
                <div className="space-y-6">
                  <h1 className="text-3xl font-bold">Add Assignment</h1>
                  <TeacherDashboard profile={profile} initialCreateOpen={true} />
                </div>
              ) : activeTab === 'students' ? (
                <div className="space-y-6">
                  <h1 className="text-3xl font-bold">Students</h1>
                  <Card>
                    <CardHeader>
                      <CardTitle>Student Roster</CardTitle>
                      <CardDescription>Manage students in your sections.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {usersList
                        .filter(u => u.role === 'STUDENT')
                        .map(u => (
                          <div key={u.uid} className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 text-primary font-bold">
                                {u.displayName?.[0] || 'S'}
                              </div>
                              <div>
                                <h3 className="font-semibold">{u.displayName}</h3>
                                <p className="text-sm text-muted-foreground">{u.email}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">Active Student</Badge>
                          </div>
                        ))}
                      {usersList.filter(u => u.role === 'STUDENT').length === 0 && (
                        <p className="text-muted-foreground italic text-center py-8">No students found.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                  <div className="bg-slate-100 p-6 rounded-full">
                    <CheckSquare className="h-12 w-12 text-slate-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-600">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
                  <p className="text-slate-400 max-w-xs">This section is currently under development. Please check back later.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      
      <Toaster position="top-right" />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    document.title = SITE_TITLE;
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AppContent />
    </ThemeProvider>
  );
}
