import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Database,
  FileCheck,
  FileText,
  Flame,
  FolderUp,
  HardDrive,
  KeyRound,
  Layers,
  Lock,
  School,
  Server,
  Shield,
  User,
  X,
  Zap
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Api } from './api.js';
import { AnimatedBackground } from './components/AnimatedBackground.js';
import { AuthModal } from './components/AuthModal.js';
import { FacultyDashboard } from './components/FacultyDashboard.js';
import { Navbar } from './components/Navbar.js';
import { ProfileModal } from './components/ProfileModal.js';
import { StudentDashboard } from './components/StudentDashboard.js';
import { TrafficSimulator } from './components/TrafficSimulator.js';
import { CurrentUser, FacultyUser, StudentUser } from './types.js';

export default function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authRole, setAuthRole] = useState<'student' | 'faculty'>('student');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [systemNotification, setSystemNotification] = useState<string | null>(null);
  const [activeTabRole, setActiveTabRole] = useState<'student' | 'faculty'>('student');

  const openAuth = (role: 'student' | 'faculty' = 'student', mode: 'login' | 'register' = 'login') => {
    setAuthRole(role);
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  useEffect(() => {
    const initApp = async () => {
      const saved = Api.getSavedUser();
      const token = Api.getToken();
      if (token && saved) {
        try {
          const fresh = await Api.getCurrentUser();
          setCurrentUser(fresh.user);
          setActiveTabRole(fresh.role as 'student' | 'faculty');
        } catch {
          Api.clearAuth();
          setCurrentUser(null);
        }
      }
      setLoading(false);
    };

    initApp();
  }, []);

  const handleLogout = () => {
    Api.clearAuth();
    setCurrentUser(null);
  };

  const handleAuthSuccess = (user: CurrentUser) => {
    setCurrentUser(user);
    setActiveTabRole(user.role);
    setIsAuthOpen(false);
    setSystemNotification(`Signed in as ${user.name} (${user.role === 'student' ? user.reg_number : user.faculty_id})`);
    setTimeout(() => setSystemNotification(null), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] bg-mesh-pattern flex items-center justify-center text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 animate-spin shadow-lg shadow-cyan-500/20">
            <Zap className="h-6 w-6" />
          </div>
          <span className="text-sm font-semibold text-slate-300">
            Initializing SecureExam CDN Engine...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#070b14] bg-mesh-pattern bg-dot-grid text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden">
      {/* Dynamic Animated Constellation & Aurora Mesh Background */}
      <AnimatedBackground />

      {/* Navbar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAuth={(role) => openAuth(role || 'student', 'login')}
        onOpenProfile={() => setIsProfileOpen(true)}
        activeRole={activeTabRole}
        onSwitchRoleTab={(role) => setActiveTabRole(role)}
      />

      {/* Toast Notification */}
      {systemNotification && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl glass-panel text-cyan-200 text-xs flex items-center space-x-2.5 animate-in slide-in-from-bottom duration-200 shadow-2xl">
          <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
          <span>{systemNotification}</span>
        </div>
      )}

      {/* Main View */}
      <main className="relative z-10 flex-1">
        {currentUser ? (
          currentUser.role === 'student' ? (
            <StudentDashboard
              student={currentUser as StudentUser}
              onOpenProfile={() => setIsProfileOpen(true)}
            />
          ) : (
            <FacultyDashboard
              faculty={currentUser as FacultyUser}
              onOpenProfile={() => setIsProfileOpen(true)}
            />
          )
        ) : (
          /* Public Portal Landing */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
            {/* Hero Section */}
            <div className="text-center space-y-5 max-w-3xl mx-auto pt-4">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 text-xs font-semibold backdrop-blur-md">
                <Shield className="h-3.5 w-3.5 text-cyan-400" />
                <span>Enterprise Academic Distribution Infrastructure</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight" style={{ textWrap: 'balance' }}>
                Secure & Reliable Digital{' '}
                <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
                  Exam Paper Distribution
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-lg mx-auto">
                High-concurrency Edge delivery for university examinations.
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setIsTestModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-bold text-xs shadow-lg shadow-orange-500/25 transition flex items-center space-x-2 cursor-pointer ring-1 ring-white/10"
                >
                  <Zap className="h-4 w-4" />
                  <span>⚡ Test 20,000 Concurrent Requests (Live Demo)</span>
                </button>
              </div>
            </div>

            {/* Portal Cards: Student & Faculty */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Student Portal Card */}
              <div className="glass-panel rounded-2xl p-7 space-y-6 hover:border-cyan-500/40 transition group">
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-blue-600/15">
                    <User className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-cyan-300 tracking-wide">
                    STUDENT PORTAL
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition">
                    Student Paper Access
                  </h3>
                </div>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>Registration-number-based access verification</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>Instant Edge CDN cached paper delivery</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>Digital security watermark with student identity</span>
                  </div>
                </div>

                <div className="pt-2 grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => openAuth('student', 'login')}
                    className="py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white transition shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-1.5 cursor-pointer ring-1 ring-white/10"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Student Sign In</span>
                  </button>
                  <button
                    onClick={() => openAuth('student', 'register')}
                    className="py-3 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-blue-500/40 font-semibold text-xs text-cyan-300 transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <User className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Register Student</span>
                  </button>
                </div>
              </div>

              {/* Faculty Portal Card */}
              <div className="glass-panel rounded-2xl p-7 space-y-6 hover:border-purple-500/40 transition group">
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-600/15">
                    <School className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-purple-300 tracking-wide">
                    FACULTY PORTAL
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition">
                    Faculty Administration
                  </h3>
                </div>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
                    <span>Multiple PDF batch upload & metadata detection</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
                    <span>Edge CDN memory cache pre-warming</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
                    <span>Live traffic monitoring & 10k request simulation</span>
                  </div>
                </div>

                <div className="pt-2 grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => openAuth('faculty', 'login')}
                    className="py-3 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-xs text-white transition shadow-lg shadow-purple-600/25 flex items-center justify-center space-x-1.5 cursor-pointer ring-1 ring-white/10"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Faculty Sign In</span>
                  </button>
                  <button
                    onClick={() => openAuth('faculty', 'register')}
                    className="py-3 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-purple-500/40 font-semibold text-xs text-purple-300 transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <School className="h-3.5 w-3.5 text-purple-400" />
                    <span>Register Faculty</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Architecture Highlights */}
            <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-5 max-w-5xl mx-auto shadow-2xl">
              <div className="text-center">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  High-Concurrency Architecture Overview
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                  <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                    <Zap className="h-4 w-4" />
                    <span>CDN & Edge Cache</span>
                  </div>
                  <div className="space-y-1 text-slate-400">
                    <div>• 1–2ms in-memory Edge delivery</div>
                    <div>• Zero origin file server overload</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                  <div className="flex items-center space-x-2 text-blue-400 font-bold">
                    <Layers className="h-4 w-4" />
                    <span>Adaptive Request Queue</span>
                  </div>
                  <div className="space-y-1 text-slate-400">
                    <div>• Traffic surge buffer during releases</div>
                    <div>• Zero 502/503 connection dropouts</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                  <div className="flex items-center space-x-2 text-purple-400 font-bold">
                    <Shield className="h-4 w-4" />
                    <span>Cohort Authorization</span>
                  </div>
                  <div className="space-y-1 text-slate-400">
                    <div>• Registration & section verification</div>
                    <div>• Student identity watermarking</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
        defaultRole={authRole}
        initialMode={authMode}
      />

      {/* Profile Modal */}
      {currentUser && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          currentUser={currentUser}
          onUpdated={(u) => {
            setCurrentUser(u);
            Api.setAuth(Api.getToken()!, u);
          }}
        />
      )}

      {/* 20,000 Concurrent Requests Stress Test Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto glass-panel rounded-2xl border border-slate-700/80 p-5 sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">20,000 Requests High-Concurrency Test</h3>
                  <p className="text-xs text-slate-400">Live pipeline stress benchmark with and without Edge CDN cache</p>
                </div>
              </div>
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-slate-400 hover:text-white transition cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <TrafficSimulator papers={[]} />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 bg-slate-950/80 border-t border-slate-850 py-6 text-xs text-slate-500 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 font-mono">
            <Shield className="h-4 w-4 text-cyan-500" />
            <span className="text-slate-300 font-semibold">SecureExam CDN</span>
            <span>· Digital Examination Distribution Platform</span>
          </div>
          <div className="flex items-center space-x-3 text-slate-400">
            <span>Edge Memory Caching</span>
            <span>·</span>
            <span>Adaptive Request Queue</span>
            <span>·</span>
            <span>Registration Identity Verified</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
