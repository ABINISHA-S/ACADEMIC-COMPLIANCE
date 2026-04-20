import mongoose from 'mongoose';
import dns from 'dns';
import path from 'path';
import { fileURLToPath } from 'url';
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch(e) {}
import dotenv from 'dotenv';
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) {
    console.log('⚡️ Using existing MongoDB connection');
    return;
  }

  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri || mongoUri.includes('<db_password>')) {
      console.warn('⚠️ MONGODB_URI still contains the <db_password> placeholder.');
      console.warn('⚠️ Server will crash if database operations are attempted.');
      return;
    }
    
    await mongoose.connect(mongoUri);
    isConnected = true;
    console.log('✅ MongoDB connected successfully');

    // Seed initial users if they don't exist
    const count = await User.countDocuments();
    if (count === 0) {
      await User.insertMany([
        { uid: 'teacher1', email: 'teacher@school.edu', password: 'password', displayName: 'Dr. Smith', role: 'TEACHER', createdAt: Date.now() },
        { uid: 'student1', email: 'student@school.edu', password: 'password', displayName: 'Student', role: 'STUDENT', createdAt: Date.now() }
      ]);
      console.log('🌱 Seeded initial test users');
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    // process.exit(1) is removed for Serverless safety! Bubble the error.
    throw error;
  }
};

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  displayName: { type: String, required: true },
  role: { type: String, enum: ['TEACHER', 'STUDENT'], required: true },
  createdAt: { type: Number, default: Date.now }
});

const assignmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  teacherId: { type: String, required: true },
  teacherName: { type: String, required: true },
  section: { type: String },
  grade: { type: String },
  deadline: { type: Number, required: true },
  formattingRules: {
    fontSize: Number,
    margins: String,
    lineSpacing: Number,
    minWordCount: Number,
    maxWordCount: Number,
    headingStructure: Boolean,
    citationStyle: String
  },
  createdAt: { type: Number, default: Date.now }
});

const submissionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  assignmentId: { type: String, required: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  content: { type: String, required: true },
  fileData: { type: String },
  fileName: { type: String },
  status: { type: String, enum: ['PENDING', 'COMPLIANT', 'NON-COMPLIANT'], default: 'PENDING' },
  submittedAt: { type: Number, default: Date.now },
  evaluation: {
    overallGrade: String,
    grammarScore: Number,
    structureScore: Number,
    relevanceScore: Number,
    plagiarismScore: Number,
    feedback: String,
    formattingDeviations: [String]
  }
});

export const User = mongoose.model('User', userSchema);
export const Assignment = mongoose.model('Assignment', assignmentSchema);
export const Submission = mongoose.model('Submission', submissionSchema);
