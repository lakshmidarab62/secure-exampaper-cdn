import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { AuthService, AuthenticatedRequest } from './server/auth.js';
import { cdnCache } from './server/cdnCache.js';
import { AccessLog, db, ExamPaper, STORAGE_DIR } from './server/db.js';
import { PdfService } from './server/pdfService.js';
import { requestQueue } from './server/requestQueue.js';
import { trafficSimulator } from './server/simulator.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Body parsing middleware
app.use(express.json({ limit: '250mb' }));
app.use(express.urlencoded({ extended: true, limit: '250mb' }));

// Multer storage for paper uploads (supports up to 100 PDFs in a single batch)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 100 }, // 100MB per file, up to 100 files
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only valid PDF documents are permitted for exam paper distribution.'));
    }
  }
});

// ==========================================
// 1. AUTHENTICATION & PROFILE APIS
// ==========================================

// Student Registration
app.post('/api/auth/student/register', (req: Request, res: Response) => {
  try {
    const { reg_number, name, email, department, semester, section, academic_year, password } = req.body;

    if (!reg_number || !name || !department || !semester || !section || !password) {
      res.status(400).json({ error: 'Please provide all required details: Registration Number, Name, Department, Semester, Section, and Password.' });
      return;
    }

    const cleanReg = reg_number.trim().toUpperCase();
    const existing = db.findStudentByRegNumber(cleanReg);
    if (existing) {
      res.status(409).json({ error: `Registration Number "${cleanReg}" is already registered. Please switch to the "Sign In" tab to log in.` });
      return;
    }

    const newStudent = db.createStudent({
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      reg_number: cleanReg,
      name: name.trim(),
      email: (email || '').trim().toLowerCase(),
      department: department.trim(),
      semester: semester.toString().trim(),
      section: section.trim(),
      academic_year: (academic_year || '2026-2027').trim(),
      password_hash: AuthService.hashPassword(password),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const token = AuthService.generateToken({
      userId: newStudent.id,
      role: 'student',
      regNumber: newStudent.reg_number,
      email: newStudent.email,
      name: newStudent.name
    });

    res.status(201).json({
      message: 'Student account created successfully.',
      token,
      user: {
        id: newStudent.id,
        role: 'student',
        reg_number: newStudent.reg_number,
        name: newStudent.name,
        email: newStudent.email,
        department: newStudent.department,
        semester: newStudent.semester,
        section: newStudent.section,
        academic_year: newStudent.academic_year
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// Student Login
app.post('/api/auth/student/login', (req: Request, res: Response) => {
  try {
    const { reg_number, password } = req.body;
    if (!reg_number || !password) {
      res.status(400).json({ error: 'Please enter both your Registration Number and Password.' });
      return;
    }

    const cleanReg = reg_number.trim().toUpperCase();
    const student = db.findStudentByRegNumber(cleanReg);
    if (!student) {
      res.status(404).json({ error: `No student account found with Registration Number "${cleanReg}". Please switch to the "Register / Sign Up" tab above to create your account first.` });
      return;
    }

    if (!AuthService.comparePassword(password, student.password_hash)) {
      res.status(401).json({ error: `Incorrect password for Registration Number "${cleanReg}". Please check your password and re-enter.` });
      return;
    }

    const token = AuthService.generateToken({
      userId: student.id,
      role: 'student',
      regNumber: student.reg_number,
      email: student.email,
      name: student.name
    });

    res.json({
      message: 'Student login successful.',
      token,
      user: {
        id: student.id,
        role: 'student',
        reg_number: student.reg_number,
        name: student.name,
        email: student.email,
        department: student.department,
        semester: student.semester,
        section: student.section,
        academic_year: student.academic_year
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Faculty Registration
app.post('/api/auth/faculty/register', (req: Request, res: Response) => {
  try {
    const { faculty_id, name, email, department, designation, password } = req.body;
    if (!faculty_id || !name || !email || !password) {
      res.status(400).json({ error: 'Faculty ID, Full Name, Email, and Password are all required.' });
      return;
    }

    const cleanId = faculty_id.trim().toUpperCase();
    const existing = db.findFacultyByIdOrEmail(cleanId) || db.findFacultyByIdOrEmail(email);
    if (existing) {
      res.status(409).json({ error: `Faculty ID "${cleanId}" or Email "${email}" is already registered. Please switch to the "Sign In" tab to log in.` });
      return;
    }

    const newFaculty = db.createFaculty({
      id: `fac_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      faculty_id: cleanId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      department: (department || 'Computer Science').trim(),
      designation: (designation || 'Professor & Head of Department').trim(),
      role: 'faculty',
      password_hash: AuthService.hashPassword(password),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const token = AuthService.generateToken({
      userId: newFaculty.id,
      role: 'faculty',
      facultyId: newFaculty.faculty_id,
      email: newFaculty.email,
      name: newFaculty.name
    });

    res.status(201).json({
      message: 'Faculty account created successfully.',
      token,
      user: {
        id: newFaculty.id,
        role: 'faculty',
        faculty_id: newFaculty.faculty_id,
        name: newFaculty.name,
        email: newFaculty.email,
        department: newFaculty.department,
        designation: newFaculty.designation
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// Faculty Login
app.post('/api/auth/faculty/login', (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      res.status(400).json({ error: 'Please enter both your Faculty ID / Email and Password.' });
      return;
    }

    const faculty = db.findFacultyByIdOrEmail(identifier);
    if (!faculty) {
      res.status(404).json({ error: `No faculty account found for "${identifier}". Please switch to the "Register / Sign Up" tab above to create your account first.` });
      return;
    }

    if (!AuthService.comparePassword(password, faculty.password_hash)) {
      res.status(401).json({ error: `Incorrect password for faculty account "${faculty.faculty_id}". Please check your password and re-enter.` });
      return;
    }

    const token = AuthService.generateToken({
      userId: faculty.id,
      role: 'faculty',
      facultyId: faculty.faculty_id,
      email: faculty.email,
      name: faculty.name
    });

    res.json({
      message: 'Faculty login successful.',
      token,
      user: {
        id: faculty.id,
        role: 'faculty',
        faculty_id: faculty.faculty_id,
        name: faculty.name,
        email: faculty.email,
        department: faculty.department,
        designation: faculty.designation
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Reset / Delete All Registered Accounts Endpoint
app.post('/api/auth/reset-all-accounts', (_req: Request, res: Response) => {
  try {
    db.clearAllAccounts();
    res.json({
      success: true,
      message: 'All registered student and faculty accounts have been cleared successfully.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to reset accounts' });
  }
});

// Current User Info
app.get('/api/auth/me', AuthService.requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role === 'student') {
    const student = db.findStudentByRegNumber(req.user.regNumber || '');
    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }
    res.json({
      role: 'student',
      user: {
        id: student.id,
        role: 'student',
        reg_number: student.reg_number,
        name: student.name,
        email: student.email,
        department: student.department,
        semester: student.semester,
        section: student.section,
        academic_year: student.academic_year
      }
    });
  } else if (req.user?.role === 'faculty') {
    const faculty = db.findFacultyById(req.user.userId);
    if (!faculty) {
      res.status(404).json({ error: 'Faculty not found' });
      return;
    }
    res.json({
      role: 'faculty',
      user: {
        id: faculty.id,
        role: 'faculty',
        faculty_id: faculty.faculty_id,
        name: faculty.name,
        email: faculty.email,
        department: faculty.department,
        designation: faculty.designation
      }
    });
  } else {
    res.status(400).json({ error: 'Invalid role' });
  }
});

// Update Student Profile
app.put('/api/student/profile', AuthService.requireStudent, (req: AuthenticatedRequest, res: Response) => {
  try {
    const student = req.student!;
    const { name, email, department, semester, section, academic_year } = req.body;

    // Notice: reg_number is immutable as the authenticated identity reference
    const updated = db.updateStudent(student.id, {
      name: name ? name.trim() : student.name,
      email: email !== undefined ? email.trim().toLowerCase() : student.email,
      department: department ? department.trim() : student.department,
      semester: semester ? semester.toString().trim() : student.semester,
      section: section ? section.trim() : student.section,
      academic_year: academic_year ? academic_year.trim() : student.academic_year
    });

    res.json({
      message: 'Student profile updated successfully.',
      user: updated
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Profile update failed' });
  }
});

// Update Faculty Profile
app.put('/api/faculty/profile', AuthService.requireFaculty, (req: AuthenticatedRequest, res: Response) => {
  try {
    const faculty = req.faculty!;
    const { name, email, department, designation } = req.body;

    // faculty_id is immutable
    const updated = db.updateFaculty(faculty.id, {
      name: name ? name.trim() : faculty.name,
      email: email ? email.trim().toLowerCase() : faculty.email,
      department: department ? department.trim() : faculty.department,
      designation: designation ? designation.trim() : faculty.designation
    });

    res.json({
      message: 'Faculty profile updated successfully.',
      user: updated
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Profile update failed' });
  }
});

// ==========================================
// 2. STUDENT EXAM PAPER DISTRIBUTION APIS
// ==========================================

// Get papers assigned to the logged-in student
app.get('/api/student/papers', AuthService.requireStudent, (req: AuthenticatedRequest, res: Response) => {
  try {
    const student = req.student!;
    const eligiblePapers = db.getPapersForStudent(student);
    const now = new Date();

    const papersWithStatus = eligiblePapers.map(paper => {
      const releaseDate = new Date(paper.release_time);
      const expiryDate = new Date(paper.expiry_time);

      let accessStatus: 'upcoming' | 'available' | 'expired' = 'available';
      if (now < releaseDate) {
        accessStatus = 'upcoming';
      } else if (now > expiryDate) {
        accessStatus = 'expired';
      }

      return {
        id: paper.id,
        title: paper.title,
        subject: paper.subject,
        department: paper.department,
        semester: paper.semester,
        section: paper.section,
        exam_type: paper.exam_type,
        exam_date: paper.exam_date,
        release_time: paper.release_time,
        expiry_time: paper.expiry_time,
        page_count: paper.page_count || 1,
        file_size: paper.file_size,
        access_status: accessStatus,
        uploaded_by_name: paper.uploaded_by_name
      };
    });

    res.json({
      student: {
        reg_number: student.reg_number,
        name: student.name,
        department: student.department,
        semester: student.semester,
        section: student.section
      },
      count: papersWithStatus.length,
      papers: papersWithStatus
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve papers' });
  }
});

// Student opens/streams exam paper (Core High-Traffic Architecture)
app.get('/api/student/papers/:id/download', AuthService.requireStudent, async (req: AuthenticatedRequest, res: Response) => {
  const startTime = performance.now();
  const student = req.student!;
  const paperId = req.params.id;
  const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

  try {
    // 1. Fetch paper from DB
    const paper = db.findPaperById(paperId);
    if (!paper) {
      db.logAccess({
        paper_id: paperId,
        paper_title: 'Unknown',
        student_id: student.id,
        student_reg_no: student.reg_number,
        timestamp: new Date().toISOString(),
        status: 'UNAUTHORIZED',
        response_time_ms: Math.round(performance.now() - startTime),
        cache_status: 'BYPASS',
        client_ip: clientIp
      });
      res.status(404).json({ error: 'Requested examination paper was not found.' });
      return;
    }

    // 2. Validate Student Eligibility against Paper Rules
    const eligiblePapers = db.getPapersForStudent(student);
    const isEligible = eligiblePapers.some(p => p.id === paper.id);
    if (!isEligible) {
      db.logAccess({
        paper_id: paper.id,
        paper_title: paper.title,
        student_id: student.id,
        student_reg_no: student.reg_number,
        timestamp: new Date().toISOString(),
        status: 'UNAUTHORIZED',
        response_time_ms: Math.round(performance.now() - startTime),
        cache_status: 'BYPASS',
        client_ip: clientIp
      });
      res.status(403).json({ error: 'Unauthorized. This examination paper is not assigned to your academic profile.' });
      return;
    }

    // 3. Validate Release and Expiry Time Windows
    const now = new Date();
    const releaseTime = new Date(paper.release_time);
    const expiryTime = new Date(paper.expiry_time);

    if (now < releaseTime) {
      db.logAccess({
        paper_id: paper.id,
        paper_title: paper.title,
        student_id: student.id,
        student_reg_no: student.reg_number,
        timestamp: new Date().toISOString(),
        status: 'BLOCKED_UNRELEASED',
        response_time_ms: Math.round(performance.now() - startTime),
        cache_status: 'BYPASS',
        client_ip: clientIp
      });
      res.status(403).json({
        error: `Paper not available yet. Examination is scheduled to be released on ${releaseTime.toLocaleString()}.`
      });
      return;
    }

    if (now > expiryTime) {
      db.logAccess({
        paper_id: paper.id,
        paper_title: paper.title,
        student_id: student.id,
        student_reg_no: student.reg_number,
        timestamp: new Date().toISOString(),
        status: 'BLOCKED_EXPIRED',
        response_time_ms: Math.round(performance.now() - startTime),
        cache_status: 'BYPASS',
        client_ip: clientIp
      });
      res.status(403).json({
        error: `Paper access period has ended. The examination paper expired at ${expiryTime.toLocaleString()}.`
      });
      return;
    }

    // 4. File existence validation & auto-healing
    const verifiedPath = await PdfService.ensurePaperFile(paper);

    // 5. High-Traffic Pipeline: Fast-Path RAM Cache vs Adaptive Origin Queue
    let result: { buffer: Buffer; etag: string; size: number; cacheStatus: 'HIT' | 'MISS' | 'BYPASS'; latencyMs: number };

    if (cdnCache.has(paper.id)) {
      // FAST-PATH: Direct RAM Cache Hit (serves 20,000+ simultaneous students in <1ms without queue overhead)
      result = await cdnCache.getPaper(
        paper.id,
        verifiedPath,
        paper.file_name,
        paper.mime_type
      );
    } else {
      // SLOW-PATH: Uncached origin read passes through queue with single-flight coalescing
      result = await requestQueue.enqueue(
        { studentId: student.id, studentRegNo: student.reg_number, paperId: paper.id },
        async () => {
          return await cdnCache.getPaper(
            paper.id,
            verifiedPath,
            paper.file_name,
            paper.mime_type
          );
        }
      );
    }

    const totalResponseTime = Math.round(performance.now() - startTime);

    // 6. Log successful access
    db.logAccess({
      paper_id: paper.id,
      paper_title: paper.title,
      student_id: student.id,
      student_reg_no: student.reg_number,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      response_time_ms: totalResponseTime,
      cache_status: result.cacheStatus,
      client_ip: clientIp
    });

    // 7. Check ETag for 304 conditional request handling
    const clientEtag = req.headers['if-none-match'];
    if (clientEtag && clientEtag === result.etag) {
      res.status(304).end();
      return;
    }

    // 8. Deliver PDF with proper cache headers & disposition
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(paper.file_name)}"`);
    res.setHeader('ETag', result.etag);
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=120');
    res.setHeader('X-Cache-Status', result.cacheStatus);
    res.setHeader('X-Response-Time-Ms', totalResponseTime.toString());
    res.setHeader('X-Student-Identity', student.reg_number);

    res.send(result.buffer);
  } catch (err: any) {
    console.error('Error delivering exam paper:', err);
    res.status(500).json({ error: err.message || 'Error processing paper delivery request.' });
  }
});

// Check student queue status during high traffic
app.get('/api/student/papers/:id/queue-status', AuthService.requireStudent, (req: AuthenticatedRequest, res: Response) => {
  const student = req.student!;
  const paperId = req.params.id;
  const status = requestQueue.getQueuePosition(student.id, paperId);
  const metrics = requestQueue.getMetrics();
  res.json({
    queued: status.position > 0,
    position: status.position,
    totalWaiting: status.totalWaiting,
    estimatedWaitTimeSec: metrics.estimatedWaitTimeSec
  });
});

// ==========================================
// 3. FACULTY MANAGEMENT & BULK UPLOAD APIS
// ==========================================

// Get all papers for faculty dashboard
app.get('/api/faculty/papers', AuthService.requireFaculty, (_req: AuthenticatedRequest, res: Response) => {
  try {
    const papers = db.examPapers;
    res.json({ count: papers.length, papers });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch papers' });
  }
});

// Faculty preview/stream of paper PDF
app.get('/api/faculty/papers/:id/preview', AuthService.requireFaculty, async (req: AuthenticatedRequest, res: Response) => {
  const paperId = req.params.id;
  try {
    const paper = db.findPaperById(paperId);
    if (!paper) {
      res.status(404).json({ error: 'Paper not found in database.' });
      return;
    }
    // Auto-heals and guarantees file existence on any host (including Vercel /tmp)
    const verifiedPath = await PdfService.ensurePaperFile(paper);
    const result = await cdnCache.getPaper(paper.id, verifiedPath, paper.file_name, paper.mime_type);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(paper.file_name)}"`);
    res.setHeader('ETag', result.etag);
    res.setHeader('X-Cache-Status', result.cacheStatus);
    res.send(result.buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve paper preview.' });
  }
});

// Multiple PDF Upload Workflow (Batch Stage & Detect up to 100 PDFs)
app.post(
  '/api/faculty/papers/upload-multiple',
  AuthService.requireFaculty,
  upload.array('papers', 100),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'Please select at least one PDF file to upload.' });
        return;
      }

      const processedPapers = [];
      const failedPapers = [];

      for (const file of files) {
        try {
          // Save to storage securely
          const saved = await PdfService.savePaperFile(file.buffer, file.originalname);

          // Extract metadata automatically to assist faculty
          const meta = await PdfService.extractMetadata(saved.filePath, file.originalname);

          // Default release period: available starting now, valid for 3 hours
          const now = new Date();
          const defaultRelease = new Date(now.getTime() - 1000); // immediately accessible
          const defaultExpiry = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours

          processedPapers.push({
            temp_file_path: saved.filePath,
            file_name: saved.fileName,
            file_size: saved.fileSize,
            file_hash: saved.fileHash,
            original_name: file.originalname,
            detected_metadata: {
              title: meta.title,
              subject: meta.subject,
              department: meta.department,
              semester: meta.semester,
              section: meta.section,
              exam_type: meta.exam_type,
              page_count: meta.page_count,
              is_student_specific: meta.is_student_specific,
              specific_reg_numbers: meta.detected_reg_numbers,
              release_time: defaultRelease.toISOString(),
              expiry_time: defaultExpiry.toISOString()
            }
          });
        } catch (err: any) {
          failedPapers.push({
            file_name: file.originalname,
            error: err.message || 'Failed to process file'
          });
        }
      }

      res.json({
        message: `Processed ${processedPapers.length} paper(s) successfully.`,
        successful_count: processedPapers.length,
        failed_count: failedPapers.length,
        papers: processedPapers,
        failures: failedPapers
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Batch upload failed' });
    }
  }
);

// Publish Batch of Staged Papers
app.post('/api/faculty/papers/publish-batch', AuthService.requireFaculty, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const faculty = req.faculty!;
    const { papers } = req.body;

    if (!Array.isArray(papers) || papers.length === 0) {
      res.status(400).json({ error: 'No paper information provided for publishing.' });
      return;
    }

    const publishedList: ExamPaper[] = [];

    for (const p of papers) {
      const newPaper: ExamPaper = {
        id: `paper_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: (p.title || p.subject || 'Examination Paper').trim(),
        subject: (p.subject || 'Academic Subject').trim(),
        department: (p.department || 'ALL').trim(),
        semester: (p.semester || 'ALL').toString().trim(),
        section: (p.section || 'ALL').trim(),
        exam_type: (p.exam_type || 'Standard Examination').trim(),
        exam_date: (p.exam_date || new Date().toISOString().split('T')[0]).trim(),
        release_time: p.release_time || new Date().toISOString(),
        expiry_time: p.expiry_time || new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
        file_path: p.temp_file_path || p.file_path,
        file_name: p.file_name,
        file_size: p.file_size || 0,
        mime_type: 'application/pdf',
        file_hash: p.file_hash || '',
        uploaded_by: faculty.id,
        uploaded_by_name: faculty.name,
        status: 'published',
        is_student_specific: !!p.is_student_specific,
        specific_reg_numbers: p.specific_reg_numbers || [],
        page_count: p.page_count || 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const created = db.createPaper(newPaper);
      publishedList.push(created);

      // Pre-warm CDN cache for optimal performance
      cdnCache.prewarmPaper(created.id, created.file_path, created.file_name);
    }

    res.status(201).json({
      message: `Successfully published ${publishedList.length} examination paper(s).`,
      count: publishedList.length,
      papers: publishedList
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Publishing batch failed' });
  }
});

// Update an individual paper (schedule, status, target group)
app.put('/api/faculty/papers/:id', AuthService.requireFaculty, (req: AuthenticatedRequest, res: Response) => {
  try {
    const paperId = req.params.id;
    const updates = req.body;
    const updated = db.updatePaper(paperId, updates);
    if (!updated) {
      res.status(404).json({ error: 'Paper not found' });
      return;
    }
    // Invalidate stale cache
    cdnCache.invalidatePaper(paperId);
    res.json({ message: 'Paper updated successfully', paper: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update paper' });
  }
});

// Delete a paper
app.delete('/api/faculty/papers/:id', AuthService.requireFaculty, (req: AuthenticatedRequest, res: Response) => {
  try {
    const paperId = req.params.id;
    const deleted = db.deletePaper(paperId);
    if (!deleted) {
      res.status(404).json({ error: 'Paper not found' });
      return;
    }
    cdnCache.invalidatePaper(paperId);
    res.json({ message: 'Paper deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete paper' });
  }
});

// Pre-warm CDN cache for a paper
app.post('/api/faculty/papers/:id/prewarm', AuthService.requireFaculty, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paper = db.findPaperById(req.params.id);
    if (!paper) {
      res.status(404).json({ error: 'Paper not found' });
      return;
    }
    const verifiedPath = await PdfService.ensurePaperFile(paper);
    const warmed = await cdnCache.prewarmPaper(paper.id, verifiedPath, paper.file_name);
    res.json({ success: warmed, message: warmed ? 'Paper cached in CDN Edge memory' : 'Pre-warm failed' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Pre-warm CDN cache for ALL papers simultaneously in RAM
app.post('/api/faculty/papers/prewarm-all', AuthService.requireFaculty, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const papers = db.examPapers;
    let warmedCount = 0;
    for (const paper of papers) {
      try {
        const verifiedPath = await PdfService.ensurePaperFile(paper);
        const warmed = await cdnCache.prewarmPaper(paper.id, verifiedPath, paper.file_name);
        if (warmed) warmedCount++;
      } catch (e) {
        // continue
      }
    }
    res.json({
      success: true,
      message: `Pre-warmed ${warmedCount} of ${papers.length} papers in CDN Edge RAM.`,
      warmed_count: warmedCount,
      total_count: papers.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to pre-warm all papers' });
  }
});

// Generate and Stage Sample Exam Papers (for immediate demonstration & testing)
app.post('/api/faculty/generate-sample-papers', AuthService.requireFaculty, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const faculty = req.faculty!;
    const now = new Date();
    const releaseTime = new Date(now.getTime() - 1000).toISOString();
    const expiryTime = new Date(now.getTime() + 4 * 3600 * 1000).toISOString();

    const sampleConfigs = [
      {
        subject: 'Distributed Cloud Architecture',
        department: 'Computer Science',
        semester: '6',
        section: 'A',
        examType: 'Midterm Examination',
        examCode: 'CS601-DCA',
        maxMarks: 100,
        duration: '3 Hours',
        instructions: [
          'Answer all questions in sequential order.',
          'State all assumptions clearly for system design questions.',
          'Calculators are permitted for performance equations.'
        ],
        questions: [
          { qNo: '1', text: 'Explain the CAP Theorem and discuss how modern distributed data stores balance consistency vs availability.', marks: 20 },
          { qNo: '2', text: 'Design a high-throughput edge CDN caching strategy for distributing large static examination payloads under flash crowds.', marks: 25 },
          { qNo: '3', text: 'Analyze request queueing algorithms (FIFO vs Leaky Bucket) for preventing origin server resource exhaustion.', marks: 25 },
          { qNo: '4', text: 'Derive the p95 and p99 response time model for a distributed microservice topology with 5 dependent RPC hops.', marks: 30 }
        ]
      },
      {
        subject: 'Database Systems & Query Optimization',
        department: 'Information Technology',
        semester: '4',
        section: 'CSE-B',
        examType: 'End-Semester Examination',
        examCode: 'IT402-DBMS',
        maxMarks: 100,
        duration: '3 Hours',
        instructions: [
          'Write clean SQL queries with proper formatting.',
          'Draw relational schema diagrams where appropriate.',
          'All answers must be legible.'
        ],
        questions: [
          { qNo: '1', text: 'Differentiate between B+ Trees and LSM Trees for write-heavy vs read-heavy database architectures.', marks: 25 },
          { qNo: '2', text: 'Explain Two-Phase Locking (2PL) and Multi-Version Concurrency Control (MVCC) with isolation level guarantees.', marks: 25 },
          { qNo: '3', text: 'Write queries demonstrating recursive CTEs and window functions for calculating cumulative student performance.', marks: 25 },
          { qNo: '4', text: 'Analyze cost-based query optimizer plans using index scans vs sequential scans with filter predicates.', marks: 25 }
        ]
      },
      {
        subject: 'Computer Networks & Security',
        department: 'Electronics & Communication',
        semester: '5',
        section: 'ALL',
        examType: 'Midterm Examination',
        examCode: 'EC504-NET',
        maxMarks: 75,
        duration: '2.5 Hours',
        instructions: [
          'Diagrams carry full weightage.',
          'Show mathematical steps for bandwidth-delay product calculations.'
        ],
        questions: [
          { qNo: '1', text: 'Detail the TLS 1.3 cryptographic handshake and explain zero round-trip resumption (0-RTT).', marks: 25 },
          { qNo: '2', text: 'Compare TCP BBR congestion control with Cubic and Reno algorithms under bursty packet loss conditions.', marks: 25 },
          { qNo: '3', text: 'Describe the working of Anycast routing for distributed DDoS mitigation and CDN edge traffic steering.', marks: 25 }
        ]
      }
    ];

    const generatedPapers: ExamPaper[] = [];

    for (const conf of sampleConfigs) {
      const generated = await PdfService.generateSampleExamPdf(conf);
      const saved = await PdfService.savePaperFile(generated.buffer, generated.fileName);

      const paper: ExamPaper = {
        id: `paper_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: conf.subject,
        subject: conf.subject,
        department: conf.department,
        semester: conf.semester,
        section: conf.section,
        exam_type: conf.examType,
        exam_date: now.toISOString().split('T')[0],
        release_time: releaseTime,
        expiry_time: expiryTime,
        file_path: saved.filePath,
        file_name: saved.fileName,
        file_size: saved.fileSize,
        mime_type: 'application/pdf',
        file_hash: saved.fileHash,
        uploaded_by: faculty.id,
        uploaded_by_name: faculty.name,
        status: 'published',
        is_student_specific: false,
        page_count: 1,
        instructions: conf.instructions,
        questions: conf.questions,
        duration: conf.duration,
        max_marks: conf.maxMarks,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const created = db.createPaper(paper);
      generatedPapers.push(created);
      await cdnCache.prewarmPaper(created.id, created.file_path, created.file_name);
    }

    res.json({
      message: `Generated and published ${generatedPapers.length} authentic examination papers.`,
      papers: generatedPapers
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Generation failed' });
  }
});

// ==========================================
// 4. MONITORING, LOGS & TRAFFIC SIMULATION
// ==========================================

// Real-time metrics for faculty dashboard
app.get('/api/faculty/metrics/realtime', AuthService.requireFaculty, (_req: AuthenticatedRequest, res: Response) => {
  try {
    const cacheStats = cdnCache.getStats();
    const queueStats = requestQueue.getMetrics();
    const recentLogs = db.accessLogs.slice(0, 50);

    // Calculate aggregated metrics from access logs
    const totalRequests = db.accessLogs.length;
    const successfulRequests = db.accessLogs.filter(l => l.status === 'SUCCESS').length;
    const blockedRequests = db.accessLogs.filter(l => l.status.startsWith('BLOCKED')).length;
    const unauthorizedRequests = db.accessLogs.filter(l => l.status === 'UNAUTHORIZED').length;

    const avgResponseTimeMs = totalRequests > 0
      ? Number((db.accessLogs.reduce((acc, curr) => acc + curr.response_time_ms, 0) / totalRequests).toFixed(1))
      : 0;

    res.json({
      system: {
        totalPapers: db.examPapers.length,
        totalStudents: db.students.length,
        totalFaculty: db.faculty.length,
        serverTime: new Date().toISOString()
      },
      cache: cacheStats,
      queue: queueStats,
      traffic: {
        totalRequests,
        successfulRequests,
        blockedRequests,
        unauthorizedRequests,
        avgResponseTimeMs
      },
      recentLogs
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Clear access logs and queue history
app.delete('/api/faculty/metrics/clear-logs', AuthService.requireFaculty, (_req: AuthenticatedRequest, res: Response) => {
  db.clearLogs();
  cdnCache.clear();
  requestQueue.clear();
  res.json({ message: 'Monitoring logs, cache metrics, and queue events cleared successfully.' });
});

// Toggle CDN Cache on/off for demonstration comparison
app.post('/api/faculty/metrics/toggle-cdn', AuthService.requireFaculty, (req: AuthenticatedRequest, res: Response) => {
  const { enabled } = req.body;
  cdnCache.setEnabled(!!enabled);
  res.json({ message: `CDN Caching is now ${cdnCache.getEnabled() ? 'ENABLED' : 'DISABLED'}`, enabled: cdnCache.getEnabled() });
});

// Toggle Queue on/off for demonstration comparison
app.post('/api/faculty/metrics/toggle-queue', AuthService.requireFaculty, (req: AuthenticatedRequest, res: Response) => {
  const { enabled } = req.body;
  requestQueue.setEnabled(!!enabled);
  res.json({ message: `Request Queue is now ${requestQueue.getEnabled() ? 'ENABLED' : 'DISABLED'}`, enabled: requestQueue.getEnabled() });
});

// Run Traffic Simulation Benchmark (Real measured execution through the delivery pipeline)
app.post('/api/simulation/run', async (req: Request, res: Response) => {
  try {
    const { requestCount = 500, optimized = true, paperId, concurrency = 50 } = req.body;

    const targetCount = Math.min(Math.max(10, Number(requestCount) || 500), 50000);

    const result = await trafficSimulator.runSimulation({
      requestCount: targetCount,
      optimized: !!optimized,
      paperId,
      concurrency: Number(concurrency) || 50
    });

    res.json({
      message: 'Simulation completed successfully.',
      result
    });
  } catch (err: any) {
    console.error('Simulation error:', err);
    res.status(500).json({ error: err.message || 'Simulation execution failed' });
  }
});

// ==========================================
// 5. EXTERNAL LOAD TESTING & BENCHMARK APIS
// (For tools like JMeter, Loader.io, k6, Gatling, Artillery)
// ==========================================

// Loader.io automatic verification token responder
app.get('/loaderio-:token', (req: Request, res: Response) => {
  const token = req.params.token.replace(/\.txt$/, '');
  res.type('text/plain').send(`loaderio-${token}`);
});

// Health & Ping endpoint for load balancers and stress testers
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cache: {
      enabled: cdnCache.getEnabled(),
      cachedPapers: cdnCache.getStats().cachedPaperCount
    },
    queue: {
      enabled: requestQueue.getEnabled(),
      concurrency: requestQueue.getConcurrencyLimit()
    }
  });
});

// Public Benchmark Paper Download (Allows JMeter / Loader.io / k6 to hammer paper delivery without auth)
app.get('/api/benchmark/download/:id?', async (req: Request, res: Response) => {
  try {
    const startTime = performance.now();
    let paper = req.params.id ? db.findPaperById(req.params.id) : null;
    if (!paper) {
      paper = db.examPapers[0];
    }
    if (!paper) {
      res.status(404).json({ error: 'No examination papers available to benchmark.' });
      return;
    }

    const verifiedPath = await PdfService.ensurePaperFile(paper);
    
    // Fast path from CDN RAM cache or origin read
    const result = await cdnCache.getPaper(paper.id, verifiedPath, paper.file_name, paper.mime_type);
    const latency = Math.round(performance.now() - startTime);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('ETag', result.etag);
    res.setHeader('X-Cache-Status', result.cacheStatus);
    res.setHeader('X-Response-Time-Ms', latency.toString());
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(result.buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Benchmark retrieval failed' });
  }
});

// ==========================================
// 5. SYSTEM INITIALIZATION & QUICK DEMO SEED
// ==========================================

app.get('/api/system/overview', (_req: Request, res: Response) => {
  res.json({
    name: 'SecureExam CDN',
    status: 'online',
    studentCount: db.students.length,
    facultyCount: db.faculty.length,
    paperCount: db.examPapers.length,
    cacheEnabled: cdnCache.getEnabled(),
    queueEnabled: requestQueue.getEnabled()
  });
});

// System Status overview
app.get('/api/system/seed-demo', async (_req: Request, res: Response) => {
  res.json({
    message: 'System ready.',
    totalPapers: db.examPapers.length
  });
});

// Global Error Handler to guarantee JSON responses on all platforms (including Vercel)
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('[Server Error Handler]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected server error occurred. Please try again.'
  });
});

// ==========================================
// 6. VITE MIDDLEWARE / STATIC ASSETS
// ==========================================

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SecureExam CDN] Server running on http://0.0.0.0:${PORT}`);
  });
}

// In standard environments (local dev or Render/Docker), start server.
// In Vercel serverless environment, Vercel invokes app directly.
if (!process.env.VERCEL) {
  startServer().catch(err => {
    console.error('Fatal error starting server:', err);
  });
}

export default app;
export { app };

