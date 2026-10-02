import {
  AlertCircle,
  CheckCircle2,
  Lock,
  Save,
  User,
  X
} from 'lucide-react';
import React, { useState } from 'react';
import { Api } from '../api.js';
import { CurrentUser, FacultyUser, StudentUser } from '../types.js';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUser;
  onUpdated: (user: CurrentUser) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdated
}) => {
  const isStudent = currentUser.role === 'student';
  const student = isStudent ? (currentUser as StudentUser) : null;
  const faculty = !isStudent ? (currentUser as FacultyUser) : null;

  // Student State
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [department, setDepartment] = useState(currentUser.department);
  const [semester, setSemester] = useState(student ? student.semester : '');
  const [section, setSection] = useState(student ? student.section : '');
  const [academicYear, setAcademicYear] = useState(student ? student.academic_year : '');

  // Faculty State
  const [designation, setDesignation] = useState(faculty ? faculty.designation : '');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      if (isStudent) {
        const res = await Api.updateStudentProfile({
          name,
          email,
          department,
          semester,
          section,
          academic_year: academicYear
        });
        onUpdated(res.user);
        setSuccess(true);
      } else {
        const res = await Api.updateFacultyProfile({
          name,
          email,
          department,
          designation
        });
        onUpdated(res.user);
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
        {/* Header */}
        <div className="p-5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-cyan-400">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Profile & Identity Settings</h3>
              <p className="text-[11px] text-slate-400">
                {isStudent ? 'Student Academic Profile' : 'Faculty Examiner Profile'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          {/* Identity lock notice */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Lock className="h-3.5 w-3.5 text-amber-400" />
              <span>Immutable Identity:</span>
            </span>
            <span className="font-mono text-cyan-300 font-bold text-xs">
              {isStudent ? student?.reg_number : faculty?.faculty_id}
            </span>
          </div>

          {success && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Profile updated successfully.</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Department</label>
            <input
              type="text"
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          {isStudent && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Semester</label>
                  <input
                    type="text"
                    required
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Section</label>
                  <input
                    type="text"
                    required
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="e.g. A, B, CSE-A"
                    className="w-full px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Academic Year</label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
            </>
          )}

          {!isStudent && (
            <div>
              <label className="block text-slate-300 mb-1">Designation</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500 transition"
              />
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 ring-1 ring-white/10 shadow-lg shadow-blue-600/25"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
