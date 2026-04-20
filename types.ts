export type UserRole = 'TEACHER' | 'STUDENT';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  section?: string;
  grade?: string;
  createdAt: number;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  teacherName: string;
  section: string;
  grade: string;
  deadline: number;
  template?: string; // Optional template text or formatting rules
  formattingRules: {
    fontSize?: number;
    margins?: string;
    lineSpacing?: number;
    headingStructure?: boolean;
    citationStyle?: string;
    minWordCount?: number;
    maxWordCount?: number;
  };
  createdAt: number;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  content: string; // The assignment text
  fileData?: string;
  fileName?: string | null;
  status: 'COMPLIANT' | 'NON-COMPLIANT' | 'PENDING';
  submittedAt: number;
  version: number;
  evaluation?: Evaluation;
}

export interface Evaluation {
  plagiarismScore: number;
  matchedContent: { text: string; source: string; similarity: number }[];
  grammarScore: number;
  structureScore: number;
  relevanceScore: number;
  formattingDeviations: string[];
  overallGrade: 'A' | 'A+' | 'B' | 'B+' | 'C'; 
  feedback: string;
  gradedAt: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'DEADLINE' | 'FEEDBACK' | 'LATE' | 'GENERAL';
  read: boolean;
  createdAt: number;
}
