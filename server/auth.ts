import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db, Faculty, Student } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secure_exam_cdn_super_secret_jwt_key_2026';

export interface AuthTokenPayload {
  userId: string;
  role: 'student' | 'faculty';
  regNumber?: string;
  facultyId?: string;
  email: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
  student?: Student;
  faculty?: Faculty;
}

export class AuthService {
  public static hashPassword(password: string): string {
    return bcrypt.hashSync(password, 10);
  }

  public static comparePassword(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash);
  }

  public static generateToken(payload: AuthTokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  }

  public static verifyToken(token: string): AuthTokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Universal auth middleware
   */
  public static requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required. Please log in.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = AuthService.verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
      return;
    }

    req.user = payload;
    next();
  }

  /**
   * Student authorization middleware
   * Verifies role and retrieves the freshest student profile from the database
   */
  public static requireStudent(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    AuthService.requireAuth(req, res, () => {
      if (req.user?.role !== 'student') {
        res.status(403).json({ error: 'Access restricted to authenticated students only.' });
        return;
      }

      // Re-verify against database using the student's unique registration number
      const student = db.findStudentByRegNumber(req.user.regNumber || '');
      if (!student) {
        res.status(403).json({ error: 'Student record not found in system database.' });
        return;
      }

      req.student = student;
      next();
    });
  }

  /**
   * Faculty authorization middleware
   */
  public static requireFaculty(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    AuthService.requireAuth(req, res, () => {
      if (req.user?.role !== 'faculty') {
        res.status(403).json({ error: 'Access restricted to authenticated faculty members.' });
        return;
      }

      const faculty = db.findFacultyById(req.user.userId);
      if (!faculty) {
        res.status(403).json({ error: 'Faculty record not found in system database.' });
        return;
      }

      req.faculty = faculty;
      next();
    });
  }
}
