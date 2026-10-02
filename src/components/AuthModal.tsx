import {
  AlertCircle,
  Building,
  Check,
  GraduationCap,
  Info,
  KeyRound,
  Lock,
  Mail,
  School,
  Shield,
  Sparkles,
  User,
  UserPlus,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Api } from '../api.js';
import { CurrentUser } from '../types.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: CurrentUser) => void;
  defaultRole?: 'student' | 'faculty';
  initialMode?: 'login' | 'register';
}

const COMMON_DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Electrical & Electronics',
  'Mechanical Engineering',
  'Civil Engineering',
  'Data Science & AI'
];

const COMMON_SECTIONS = ['A', 'B', 'C', 'D', 'CSE-A', 'CSE-B'];

const COMMON_DESIGNATIONS = [
  'Professor & Head of Department',
  'Associate Professor',
  'Assistant Professor',
  'Chief Superintendent & Controller of Exams',
  'Senior Faculty Examiner'
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultRole = 'student',
  initialMode = 'login'
}) => {
  const [role, setRole] = useState<'student' | 'faculty'>(defaultRole);
  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Student Form State
  const [studentRegNo, setStudentRegNo] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentDept, setStudentDept] = useState('Computer Science');
  const [customDept, setCustomDept] = useState(false);
  const [studentSem, setStudentSem] = useState('6');
  const [studentSec, setStudentSec] = useState('A');
  const [studentAcadYear, setStudentAcadYear] = useState('2026-2027');

  // Faculty Form State
  const [facultyIdentifier, setFacultyIdentifier] = useState('');
  const [facultyPassword, setFacultyPassword] = useState('');
  const [facultyName, setFacultyName] = useState('');
  const [facultyEmail, setFacultyEmail] = useState('');
  const [facultyDept, setFacultyDept] = useState('Computer Science');
  const [customFacultyDept, setCustomFacultyDept] = useState(false);
  const [facultyDesignation, setFacultyDesignation] = useState('Professor & Head of Department');
  const [customDesignation, setCustomDesignation] = useState(false);

  // Form remount key to guarantee clean state
  const [formKey, setFormKey] = useState<number>(Date.now());

  // Synchronize on modal open or prop change
  useEffect(() => {
    if (isOpen) {
      setRole(defaultRole);
      setIsRegister(initialMode === 'register');
      setStudentRegNo('');
      setStudentPassword('');
      setStudentName('');
      setStudentEmail('');
      setFacultyIdentifier('');
      setFacultyPassword('');
      setFacultyName('');
      setFacultyEmail('');
      setError(null);
      setFormKey(Date.now());
    }
  }, [isOpen, defaultRole, initialMode]);

  const handleRoleChange = (newRole: 'student' | 'faculty') => {
    setRole(newRole);
    setError(null);
    setFormKey(Date.now());
  };

  const handleModeChange = (registerMode: boolean) => {
    setIsRegister(registerMode);
    setError(null);
    setFormKey(Date.now());
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (role === 'student') {
        if (isRegister) {
          if (!studentRegNo.trim() || !studentPassword.trim() || !studentName.trim()) {
            throw new Error('Please fill in Student Name, Registration Number, and Password.');
          }
          const res = await Api.registerStudent({
            reg_number: studentRegNo.trim(),
            name: studentName.trim(),
            email: studentEmail.trim(),
            department: studentDept.trim(),
            semester: studentSem.toString().trim(),
            section: studentSec.trim(),
            academic_year: studentAcadYear.trim(),
            password: studentPassword
          });
          onSuccess(res.user);
        } else {
          if (!studentRegNo.trim() || !studentPassword) {
            throw new Error('Please enter both your Registration Number and Password.');
          }
          const res = await Api.loginStudent(studentRegNo.trim(), studentPassword);
          onSuccess(res.user);
        }
      } else {
        if (isRegister) {
          if (!facultyIdentifier.trim() || !facultyPassword.trim() || !facultyName.trim() || !facultyEmail.trim()) {
            throw new Error('Please fill in Faculty ID, Name, Email, and Password.');
          }
          const res = await Api.registerFaculty({
            faculty_id: facultyIdentifier.trim(),
            name: facultyName.trim(),
            email: facultyEmail.trim(),
            department: facultyDept.trim(),
            designation: facultyDesignation.trim(),
            password: facultyPassword
          });
          onSuccess(res.user);
        } else {
          if (!facultyIdentifier.trim() || !facultyPassword) {
            throw new Error('Please enter your Faculty ID / Email and Password.');
          }
          const res = await Api.loginFaculty(facultyIdentifier.trim(), facultyPassword);
          onSuccess(res.user);
        }
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel relative w-full max-w-lg rounded-2xl shadow-2xl shadow-black/80 overflow-hidden ring-1 ring-white/10">
        
        {/* Header */}
        <div className="p-5 bg-slate-950/80 border-b border-slate-800/90 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-md ${
              role === 'student'
                ? 'bg-blue-600/25 border border-blue-500/40 text-cyan-400 shadow-blue-500/10'
                : 'bg-purple-600/25 border border-purple-500/40 text-purple-400 shadow-purple-500/10'
            }`}>
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                <span>
                  {role === 'student' ? 'Student Portal' : 'Faculty Portal'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-semibold ${
                  isRegister
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {isRegister ? 'Sign Up' : 'Sign In'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isRegister
                  ? `Create a new ${role} account`
                  : `Sign in with your registered ${role} credentials`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 1. Primary Role Tabs: Student vs Faculty */}
        <div className="grid grid-cols-2 p-2 bg-slate-950/70 border-b border-slate-800/80 text-xs font-semibold gap-2">
          <button
            type="button"
            onClick={() => handleRoleChange('student')}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center space-x-2 transition cursor-pointer ${
              role === 'student'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 ring-1 ring-white/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            <span>Student Portal</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('faculty')}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center space-x-2 transition cursor-pointer ${
              role === 'faculty'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 ring-1 ring-white/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <School className="h-4 w-4" />
            <span>Faculty Portal</span>
          </button>
        </div>

        {/* 2. Secondary Mode Tabs: [Sign In] vs [Register / Sign Up] */}
        <div className="flex bg-slate-900/80 p-2 border-b border-slate-800/80 gap-2">
          <button
            type="button"
            onClick={() => handleModeChange(false)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
              !isRegister
                ? 'bg-slate-800 text-cyan-300 shadow-md ring-1 ring-cyan-500/30 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>1. Sign In (Existing User)</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange(true)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
              isRegister
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md ring-1 ring-emerald-400/30 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>2. Register / Sign Up (New User)</span>
          </button>
        </div>

        {/* Helpful Mode Explanation Banner */}
        <div className={`px-6 py-2.5 border-b text-xs flex items-center justify-between ${
          isRegister
            ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
            : 'bg-blue-950/30 border-blue-800/40 text-blue-300'
        }`}>
          <div className="flex items-center space-x-2">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>
              {isRegister
                ? `Enter your details below to register a new ${role} account.`
                : `Enter your ${role === 'student' ? 'Registration Number' : 'Faculty ID / Email'} and password.`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleModeChange(!isRegister)}
            className="text-[11px] underline underline-offset-2 hover:text-white font-medium cursor-pointer shrink-0 ml-2"
          >
            {isRegister ? 'Switch to Sign In' : 'Need to Register?'}
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/70 text-rose-300 text-xs flex items-start space-x-2.5 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="space-y-1">
              <span>{error}</span>
              {!isRegister && error.includes('Register') && (
                <div>
                  <button
                    type="button"
                    onClick={() => handleModeChange(true)}
                    className="mt-1 font-semibold text-cyan-300 hover:text-cyan-200 underline cursor-pointer"
                  >
                    👉 Click here to open the Registration Form
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Form Body */}
        <form
          key={formKey}
          onSubmit={handleSubmit}
          autoComplete="off"
          className="p-6 space-y-4 max-h-[60vh] overflow-y-auto"
        >
          {role === 'student' ? (
            /* STUDENT FORM */
            <>
              {isRegister ? (
                /* Registration Fields */
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Full Student Name <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="e.g. Jyoshna Reddy"
                        className="w-full pl-9 pr-3.5 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Registration Number / Roll No <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={studentRegNo}
                        onChange={(e) => setStudentRegNo(e.target.value.toUpperCase())}
                        placeholder="e.g. 99240040443"
                        className="w-full pl-9 pr-3.5 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-cyan-500 transition"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      This registration number will be used to log in and verify your examination papers.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Institutional Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="email"
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        placeholder="student@klu.ac.in"
                        className="w-full pl-9 pr-3.5 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 transition"
                      />
                    </div>
                  </div>

                  {/* Department */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">
                        Department
                      </label>
                      <button
                        type="button"
                        onClick={() => setCustomDept(!customDept)}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
                      >
                        {customDept ? 'Pick from list' : '+ Custom department'}
                      </button>
                    </div>

                    {customDept ? (
                      <input
                        type="text"
                        required
                        value={studentDept}
                        onChange={(e) => setStudentDept(e.target.value)}
                        placeholder="e.g. Aerospace Engineering"
                        className="w-full px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    ) : (
                      <select
                        value={studentDept}
                        onChange={(e) => setStudentDept(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        {COMMON_DEPARTMENTS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Semester */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Semester: <span className="text-cyan-300 font-bold">Sem {studentSem}</span>
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['1', '2', '3', '4', '5', '6', '7', '8'].map(sem => (
                        <button
                          key={sem}
                          type="button"
                          onClick={() => setStudentSem(sem)}
                          className={`py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            studentSem === sem
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                              : 'bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                          }`}
                        >
                          Sem {sem}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Section */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Section: <span className="text-amber-300 font-bold font-mono">{studentSec}</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {COMMON_SECTIONS.map(sec => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setStudentSec(sec)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                            studentSec === sec
                              ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                              : 'bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {sec}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      required
                      value={studentSec}
                      onChange={(e) => setStudentSec(e.target.value)}
                      placeholder="Or enter custom section (e.g. 24S05, Alpha)"
                      className="w-full px-3 py-1.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Academic Year */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Academic Year
                    </label>
                    <select
                      value={studentAcadYear}
                      onChange={(e) => setStudentAcadYear(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="2026-2027">2026-2027</option>
                      <option value="2025-2026">2025-2026</option>
                      <option value="2027-2028">2027-2028</option>
                    </select>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Create Password <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={studentPassword}
                        onChange={(e) => setStudentPassword(e.target.value)}
                        placeholder="Choose a secure password"
                        className="w-full pl-9 pr-3.5 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 transition"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Student Sign In Fields Only */
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Registration Number <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={studentRegNo}
                        onChange={(e) => setStudentRegNo(e.target.value.toUpperCase())}
                        placeholder="Enter your Student Registration Number"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-cyan-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Password <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={studentPassword}
                        onChange={(e) => setStudentPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 transition"
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            /* FACULTY FORM */
            <>
              {isRegister ? (
                /* Faculty Registration Fields */
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Faculty Full Name <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={facultyName}
                        onChange={(e) => setFacultyName(e.target.value)}
                        placeholder="e.g. Dr. Diwakar"
                        className="w-full pl-9 pr-3.5 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Faculty ID Code <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={facultyIdentifier}
                        onChange={(e) => setFacultyIdentifier(e.target.value.toUpperCase())}
                        placeholder="e.g. FAC-CSE-107"
                        className="w-full pl-9 pr-3.5 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-purple-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Institutional Email Address <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={facultyEmail}
                        onChange={(e) => setFacultyEmail(e.target.value)}
                        placeholder="diwakar@klu.ac.in"
                        className="w-full pl-9 pr-3.5 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition"
                      />
                    </div>
                  </div>

                  {/* Department */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">
                        Department
                      </label>
                      <button
                        type="button"
                        onClick={() => setCustomFacultyDept(!customFacultyDept)}
                        className="text-[11px] text-purple-400 hover:text-purple-300 cursor-pointer"
                      >
                        {customFacultyDept ? 'Pick from list' : '+ Enter other'}
                      </button>
                    </div>

                    {customFacultyDept ? (
                      <input
                        type="text"
                        value={facultyDept}
                        onChange={(e) => setFacultyDept(e.target.value)}
                        placeholder="e.g. School of Computing"
                        className="w-full px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    ) : (
                      <select
                        value={facultyDept}
                        onChange={(e) => setFacultyDept(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                      >
                        {COMMON_DEPARTMENTS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Designation */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">
                        Designation / Role Title
                      </label>
                      <button
                        type="button"
                        onClick={() => setCustomDesignation(!customDesignation)}
                        className="text-[11px] text-purple-400 hover:text-purple-300 cursor-pointer"
                      >
                        {customDesignation ? 'Pick title' : '+ Custom title'}
                      </button>
                    </div>

                    {customDesignation ? (
                      <input
                        type="text"
                        value={facultyDesignation}
                        onChange={(e) => setFacultyDesignation(e.target.value)}
                        placeholder="e.g. Associate Professor"
                        className="w-full px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    ) : (
                      <select
                        value={facultyDesignation}
                        onChange={(e) => setFacultyDesignation(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                      >
                        {COMMON_DESIGNATIONS.map(des => (
                          <option key={des} value={des}>{des}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Create Password <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={facultyPassword}
                        onChange={(e) => setFacultyPassword(e.target.value)}
                        placeholder="Choose a faculty password"
                        className="w-full pl-9 pr-3.5 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Faculty Sign In Fields Only */
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Faculty ID or Registered Email <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={facultyIdentifier}
                        onChange={(e) => setFacultyIdentifier(e.target.value)}
                        placeholder="Enter Faculty ID (e.g. FAC-CSE-107) or Email"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-purple-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Password <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={facultyPassword}
                        onChange={(e) => setFacultyPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition"
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs text-white transition shadow-lg flex items-center justify-center space-x-2 cursor-pointer ring-1 ring-white/10 ${
                role === 'student'
                  ? isRegister
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                  : isRegister
                    ? 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/30'
                    : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30'
              } ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <span>Processing...</span>
              ) : isRegister ? (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Register New {role === 'student' ? 'Student' : 'Faculty'} Account</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Sign In as {role === 'student' ? 'Student' : 'Faculty'}</span>
                </>
              )}
            </button>
          </div>

          {/* Switch Prompt */}
          <div className="text-center pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => handleModeChange(!isRegister)}
              className="text-xs text-slate-400 hover:text-cyan-400 transition cursor-pointer font-medium"
            >
              {isRegister
                ? 'Already have an account? Click here to Sign In'
                : 'Need to create an account? Click here to Register / Sign Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
