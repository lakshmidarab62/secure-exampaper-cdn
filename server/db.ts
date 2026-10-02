import fs from 'fs';
import path from 'path';
import { INITIAL_STUDENTS, INITIAL_FACULTY, INITIAL_PAPERS } from './seedData.js';

export interface Student {
  id: string;
  reg_number: string;
  name: string;
  email: string;
  department: string;
  semester: string; // e.g. "4", "6", etc.
  section: string;  // dynamic string: "A", "B", "CSE-1", "Alpha", etc.
  academic_year: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface Faculty {
  id: string;
  faculty_id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  role: 'faculty' | 'admin';
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface ExamPaper {
  id: string;
  title: string;
  subject: string;
  department: string; // "All" or specific department
  semester: string;   // "All" or specific semester
  section: string;    // "All" or specific section (e.g. "A", "CSE-B", etc.)
  exam_type: string;  // e.g. "Midterm Examination", "Final Semester Exam", "Surprise Quiz"
  exam_date: string;
  release_time: string; // ISO 8601
  expiry_time: string;  // ISO 8601
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  file_hash: string;
  uploaded_by: string;
  uploaded_by_name: string;
  status: 'draft' | 'published' | 'archived';
  is_student_specific?: boolean;
  specific_reg_numbers?: string[]; // if only specific students are targeted
  page_count?: number;
  instructions?: string[];
  questions?: { qNo: string; text: string; marks: number }[];
  duration?: string;
  max_marks?: number;
  created_at: string;
  updated_at: string;
}

export interface AccessLog {
  id: string;
  paper_id: string;
  paper_title: string;
  student_id: string;
  student_reg_no: string;
  timestamp: string;
  status: 'SUCCESS' | 'QUEUED' | 'BLOCKED_UNRELEASED' | 'BLOCKED_EXPIRED' | 'UNAUTHORIZED';
  response_time_ms: number;
  cache_status: 'HIT' | 'MISS' | 'BYPASS';
  client_ip: string;
}

export interface QueueEvent {
  id: string;
  request_id: string;
  timestamp: string;
  queue_wait_ms: number;
  process_time_ms: number;
  status: 'COMPLETED' | 'TIMEOUT' | 'DROPPED';
}

interface DatabaseSchema {
  students: Student[];
  faculty: Faculty[];
  exam_papers: ExamPaper[];
  access_logs: AccessLog[];
  queue_events: QueueEvent[];
}

const isVercel = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const BASE_DIR = isVercel ? '/tmp' : process.cwd();

const DATA_DIR = path.resolve(BASE_DIR, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const STORAGE_DIR = path.resolve(BASE_DIR, 'storage', 'papers');

// Ensure directories exist safely
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('Directory creation warning:', err);
}

// On Vercel, copy bundled db.json if /tmp/data/db.json does not exist yet
const BUNDLED_DB_FILE = path.resolve(process.cwd(), 'data', 'db.json');
if (isVercel && !fs.existsSync(DB_FILE) && fs.existsSync(BUNDLED_DB_FILE)) {
  try {
    fs.copyFileSync(BUNDLED_DB_FILE, DB_FILE);
  } catch (err) {
    console.warn('Could not copy initial db.json to /tmp:', err);
  }
}

class Database {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          students: (parsed.students && parsed.students.length > 0) ? parsed.students : [...INITIAL_STUDENTS],
          faculty: (parsed.faculty && parsed.faculty.length > 0) ? parsed.faculty : [...INITIAL_FACULTY],
          exam_papers: (parsed.exam_papers && parsed.exam_papers.length > 0) ? parsed.exam_papers : [...INITIAL_PAPERS],
          access_logs: parsed.access_logs || [],
          queue_events: parsed.queue_events || []
        };
      }
    } catch (e) {
      console.warn('Note: using embedded initial seed data:', e);
    }
    return {
      students: [...INITIAL_STUDENTS],
      faculty: [...INITIAL_FACULTY],
      exam_papers: [...INITIAL_PAPERS],
      access_logs: [],
      queue_events: []
    };
  }

  public save(): void {
    // Debounce writes to disk for high-performance durability
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      try {
        const tempPath = `${DB_FILE}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
        fs.renameSync(tempPath, DB_FILE);
      } catch (err) {
        console.warn('Persistence notice (normal in ephemeral serverless instances):', err);
      }
    }, 100);
  }

  public flushSync(): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to flushSync db.json:', err);
    }
  }

  public reload(): void {
    this.data = this.load();
  }

  public clearAllAccounts(): void {
    this.data.students = [];
    this.data.faculty = [];
    this.save();
    this.flushSync();
  }

  // Students operations
  get students(): Student[] {
    return this.data.students;
  }

  findStudentByRegNumber(regNo: string): Student | undefined {
    return this.data.students.find(
      s => s.reg_number.trim().toUpperCase() === regNo.trim().toUpperCase()
    );
  }

  findStudentById(id: string): Student | undefined {
    return this.data.students.find(s => s.id === id);
  }

  createStudent(student: Student): Student {
    this.data.students.push(student);
    this.save();
    return student;
  }

  updateStudent(id: string, updates: Partial<Student>): Student | null {
    const idx = this.data.students.findIndex(s => s.id === id);
    if (idx === -1) return null;
    this.data.students[idx] = {
      ...this.data.students[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.save();
    return this.data.students[idx];
  }

  // Faculty operations
  get faculty(): Faculty[] {
    return this.data.faculty;
  }

  findFacultyByIdOrEmail(identifier: string): Faculty | undefined {
    const clean = identifier.trim().toLowerCase();
    return this.data.faculty.find(
      f => f.faculty_id.toLowerCase() === clean || f.email.toLowerCase() === clean
    );
  }

  findFacultyById(id: string): Faculty | undefined {
    return this.data.faculty.find(f => f.id === id);
  }

  createFaculty(facultyMember: Faculty): Faculty {
    this.data.faculty.push(facultyMember);
    this.save();
    return facultyMember;
  }

  updateFaculty(id: string, updates: Partial<Faculty>): Faculty | null {
    const idx = this.data.faculty.findIndex(f => f.id === id);
    if (idx === -1) return null;
    this.data.faculty[idx] = {
      ...this.data.faculty[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.save();
    return this.data.faculty[idx];
  }

  // Exam Papers operations
  get examPapers(): ExamPaper[] {
    return this.data.exam_papers;
  }

  findPaperById(id: string): ExamPaper | undefined {
    return this.data.exam_papers.find(p => p.id === id);
  }

  createPaper(paper: ExamPaper): ExamPaper {
    this.data.exam_papers.push(paper);
    this.save();
    return paper;
  }

  updatePaper(id: string, updates: Partial<ExamPaper>): ExamPaper | null {
    const idx = this.data.exam_papers.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.data.exam_papers[idx] = {
      ...this.data.exam_papers[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.save();
    return this.data.exam_papers[idx];
  }

  deletePaper(id: string): boolean {
    const idx = this.data.exam_papers.findIndex(p => p.id === id);
    if (idx === -1) return false;
    const paper = this.data.exam_papers[idx];
    if (paper.file_path && fs.existsSync(paper.file_path)) {
      try {
        fs.unlinkSync(paper.file_path);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }
    this.data.exam_papers.splice(idx, 1);
    this.save();
    return true;
  }

  // Student eligibility check
  getPapersForStudent(student: Student): ExamPaper[] {
    const now = new Date().toISOString();
    return this.data.exam_papers.filter(paper => {
      // Must be published
      if (paper.status !== 'published') return false;

      // Check student-specific condition if specified
      if (paper.is_student_specific && paper.specific_reg_numbers && paper.specific_reg_numbers.length > 0) {
        const matchesReg = paper.specific_reg_numbers.some(
          r => r.trim().toUpperCase() === student.reg_number.trim().toUpperCase()
        );
        if (!matchesReg) return false;
      }

      // Check department mapping
      const paperDept = paper.department ? paper.department.trim().toUpperCase() : 'ALL';
      const studentDept = student.department ? student.department.trim().toUpperCase() : '';
      if (paperDept !== 'ALL' && paperDept !== studentDept) {
        return false;
      }

      // Check semester mapping
      const paperSem = paper.semester ? paper.semester.trim().toUpperCase() : 'ALL';
      const studentSem = student.semester ? student.semester.trim().toUpperCase() : '';
      if (paperSem !== 'ALL' && paperSem !== studentSem) {
        return false;
      }

      // Check section mapping (supports dynamic sections such as "A", "B", "CSE-A", "Group-1", etc.)
      const paperSec = paper.section ? paper.section.trim().toUpperCase() : 'ALL';
      const studentSec = student.section ? student.section.trim().toUpperCase() : '';
      if (paperSec !== 'ALL') {
        // May contain comma separated sections
        const allowedSections = paperSec.split(',').map(s => s.trim());
        if (!allowedSections.includes(studentSec)) {
          return false;
        }
      }

      return true;
    });
  }

  // Access Logs
  get accessLogs(): AccessLog[] {
    return this.data.access_logs;
  }

  logAccess(entry: Omit<AccessLog, 'id'>): AccessLog {
    const log: AccessLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...entry
    };
    this.data.access_logs.unshift(log);
    // Keep last 1,000 logs in memory/store
    if (this.data.access_logs.length > 1000) {
      this.data.access_logs.pop();
    }
    this.save();
    return log;
  }

  clearLogs(): void {
    this.data.access_logs = [];
    this.data.queue_events = [];
    this.save();
  }

  // Queue Events
  logQueueEvent(entry: Omit<QueueEvent, 'id'>): QueueEvent {
    const event: QueueEvent = {
      id: `qe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...entry
    };
    this.data.queue_events.unshift(event);
    if (this.data.queue_events.length > 500) {
      this.data.queue_events.pop();
    }
    this.save();
    return event;
  }
}

export const db = new Database();
export { STORAGE_DIR };
