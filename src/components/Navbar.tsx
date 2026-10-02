import {
  Activity,
  GraduationCap,
  Layers,
  LogOut,
  School,
  Shield,
  User,
  Zap
} from 'lucide-react';
import React from 'react';
import { CurrentUser } from '../types.js';

interface NavbarProps {
  currentUser: CurrentUser | null;
  onLogout: () => void;
  onOpenAuth: (role?: 'student' | 'faculty') => void;
  onOpenProfile: () => void;
  activeRole: 'student' | 'faculty';
  onSwitchRoleTab?: (role: 'student' | 'faculty') => void;
  cacheEnabled?: boolean;
  queueEnabled?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  onOpenAuth,
  onOpenProfile,
  cacheEnabled = true,
  queueEnabled = true
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/75 backdrop-blur-xl border-b border-slate-800/80 text-white shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Zone: Clean, single-element lockup */}
          <div className="flex items-center space-x-3.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 ring-1 ring-white/20">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  SecureExam<span className="text-cyan-400">CDN</span>
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                  Distribution Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                High-Concurrency Digital Exam Paper Delivery
              </p>
            </div>
          </div>

          {/* System Telemetry Badges */}
          <div className="hidden md:flex items-center space-x-3 text-xs">
            <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border font-mono ${
              cacheEnabled
                ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
                : 'bg-amber-950/50 border-amber-800/60 text-amber-300'
            }`}>
              <Zap className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              <span>CDN: <strong>{cacheEnabled ? 'ACTIVE' : 'BYPASS'}</strong></span>
            </div>

            <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border font-mono ${
              queueEnabled
                ? 'bg-blue-950/50 border-blue-800/60 text-blue-300'
                : 'bg-slate-850/60 border-slate-750 text-slate-400'
            }`}>
              <Layers className="h-3.5 w-3.5 text-blue-400" />
              <span>Queue: <strong>{queueEnabled ? 'ON' : 'OFF'}</strong></span>
            </div>
          </div>

          {/* User Controls */}
          <div className="flex items-center space-x-3">
            {currentUser ? (
              <div className="flex items-center space-x-2 sm:space-x-3">
                {/* Profile Pill */}
                <button
                  onClick={onOpenProfile}
                  className="flex items-center space-x-2.5 px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 transition text-left cursor-pointer group shadow-sm"
                  title="View Profile and Settings"
                >
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    currentUser.role === 'student'
                      ? 'bg-blue-600/25 text-blue-400 border border-blue-500/30'
                      : 'bg-purple-600/25 text-purple-400 border border-purple-500/30'
                  }`}>
                    {currentUser.role === 'student' ? 'S' : 'F'}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-white">
                      {currentUser.name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {currentUser.role === 'student' ? currentUser.reg_number : currentUser.faculty_id}
                    </div>
                  </div>
                </button>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  className="p-2 rounded-xl bg-slate-900/80 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800/60 border border-slate-800 text-slate-400 transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onOpenAuth('student')}
                  className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition cursor-pointer flex items-center space-x-1.5 ring-1 ring-white/10"
                >
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>Student Portal</span>
                </button>
                <button
                  onClick={() => onOpenAuth('faculty')}
                  className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-purple-600/90 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20 transition cursor-pointer flex items-center space-x-1.5 ring-1 ring-white/10"
                >
                  <School className="h-3.5 w-3.5" />
                  <span>Faculty Portal</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
