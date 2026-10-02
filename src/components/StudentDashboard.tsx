import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  Layers,
  Lock,
  RefreshCw,
  Search,
  Shield,
  User
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Api } from '../api.js';
import { ExamPaperItem, StudentUser } from '../types.js';
import { PdfViewerModal } from './PdfViewerModal.js';

interface StudentDashboardProps {
  student: StudentUser;
  onOpenProfile: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  student,
  onOpenProfile
}) => {
  const [papers, setPapers] = useState<ExamPaperItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // PDF Viewing & Queue handling
  const [activePaper, setActivePaper] = useState<ExamPaperItem | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfCacheStatus, setPdfCacheStatus] = useState<string | null>(null);
  const [pdfResponseTime, setPdfResponseTime] = useState<string | null>(null);
  const [pdfEtag, setPdfEtag] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Queue state for student during traffic bursts
  const [isQueueing, setIsQueueing] = useState(false);
  const [queueMessage, setQueueMessage] = useState<string | null>(null);

  const fetchPapers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await Api.getStudentPapers();
      setPapers(res.papers);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch assigned exam papers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
    const interval = setInterval(fetchPapers, 30000);
    return () => clearInterval(interval);
  }, [student.id]);

  const handleOpenPaper = async (paper: ExamPaperItem) => {
    if (paper.access_status === 'upcoming') {
      const releaseDate = new Date(paper.release_time);
      setError(`This examination paper is not released yet. Scheduled for ${releaseDate.toLocaleTimeString()} on ${releaseDate.toLocaleDateString()}.`);
      return;
    }

    if (paper.access_status === 'expired') {
      setError('Paper access period has ended. This examination paper is no longer accessible.');
      return;
    }

    setError(null);
    setActivePaper(paper);
    setIsQueueing(true);
    setQueueMessage('High traffic detected. Your request is being processed.');

    try {
      const result = await Api.fetchPaperBlob(paper.id);
      setPdfBlob(result.blob);
      setPdfCacheStatus(result.cacheStatus);
      setPdfResponseTime(result.responseTimeMs);
      setPdfEtag(result.etag);
      setIsViewerOpen(true);
    } catch (err: any) {
      setError(err.message || 'Unable to open paper at this moment. Please retry.');
    } finally {
      setIsQueueing(false);
      setQueueMessage(null);
    }
  };

  const filteredPapers = papers.filter(p =>
    p.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.exam_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableCount = papers.filter(p => p.access_status === 'available').length;
  const upcomingCount = papers.filter(p => p.access_status === 'upcoming').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Student Academic Identification Header */}
      <div className="glass-panel relative overflow-hidden rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span className="font-semibold text-cyan-400">Authenticated Student Record</span>
              <span aria-hidden="true">·</span>
              <span>Academic Year {student.academic_year || '2026-2027'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {student.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono text-slate-300">
              <span className="px-3 py-1 rounded-lg bg-slate-950/80 border border-slate-700/80 text-cyan-300 font-bold">
                Reg No: {student.reg_number}
              </span>
              <span className="px-3 py-1 rounded-lg bg-slate-950/80 border border-slate-700/80">
                Department: {student.department}
              </span>
              <span className="px-3 py-1 rounded-lg bg-slate-950/80 border border-slate-700/80">
                Semester: {student.semester}
              </span>
              <span className="px-3 py-1 rounded-lg bg-slate-950/80 border border-slate-700/80 text-amber-300 font-bold">
                Section: {student.section}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenProfile}
              className="px-4 py-2.5 rounded-xl bg-slate-850 hover:bg-slate-750 text-slate-200 text-xs font-medium border border-slate-700/80 transition flex items-center space-x-2 cursor-pointer shadow-sm"
            >
              <User className="h-4 w-4 text-cyan-400" />
              <span>Edit Profile</span>
            </button>
            <button
              onClick={fetchPapers}
              className="p-2.5 rounded-xl bg-slate-850 hover:bg-slate-750 text-slate-300 border border-slate-700/80 transition cursor-pointer shadow-sm"
              title="Refresh Papers"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl flex items-center space-x-4 shadow-lg">
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
            <FileCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">{availableCount}</div>
            <div className="text-xs text-slate-400">Papers Available Now</div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center space-x-4 shadow-lg">
          <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-400">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">{upcomingCount}</div>
            <div className="text-xs text-slate-400">Scheduled / Upcoming</div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center space-x-4 shadow-lg">
          <div className="p-3.5 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-400">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">{papers.length}</div>
            <div className="text-xs text-slate-400">Total Assigned Papers</div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-800/70 text-rose-300 text-xs sm:text-sm flex items-start space-x-3 shadow-lg">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Notice:</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Section: Available Exam Papers */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <FileText className="h-5 w-5 text-cyan-400" />
              <span>Assigned Examination Papers</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Filtered dynamically by Department ({student.department}), Semester ({student.semester}), and Section ({student.section}).
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search paper or subject..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>
        </div>

        {/* Papers List */}
        {loading ? (
          <div className="glass-panel p-12 text-center rounded-2xl">
            <div className="inline-flex p-3 rounded-full bg-slate-800 text-cyan-400 mb-3 animate-spin">
              <RefreshCw className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-300">Retrieving assigned examination papers...</p>
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl border-dashed">
            <FileText className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-300">No Examination Papers Currently Assigned</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              There are currently no papers published matching your academic profile ({student.department}, Sem {student.semester}, Sec {student.section}). As soon as faculty publishes a paper for your section, it will appear here immediately.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPapers.map((paper) => {
              const releaseDate = new Date(paper.release_time);
              const expiryDate = new Date(paper.expiry_time);
              const isAvailable = paper.access_status === 'available';
              const isUpcoming = paper.access_status === 'upcoming';
              const isExpired = paper.access_status === 'expired';

              return (
                <div
                  key={paper.id}
                  className="glass-card flex flex-col justify-between rounded-2xl overflow-hidden"
                >
                  <div className="p-5 space-y-3.5">
                    {/* Header info */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-300 truncate">
                        {paper.exam_type}
                      </span>
                      {isAvailable && (
                        <span className="inline-flex items-center space-x-1.5 text-[11px] font-bold text-emerald-400">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>Available Now</span>
                        </span>
                      )}
                      {isUpcoming && (
                        <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-amber-400">
                          <Clock className="h-3 w-3" />
                          <span>Scheduled</span>
                        </span>
                      )}
                      {isExpired && (
                        <span className="text-[11px] font-semibold text-slate-500">
                          Access Ended
                        </span>
                      )}
                    </div>

                    {/* Paper Title & Subject */}
                    <div>
                      <h3 className="text-base font-bold text-white line-clamp-2">
                        {paper.subject}
                      </h3>
                      {paper.title && paper.title !== paper.subject && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                          {paper.title}
                        </p>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center space-x-1.5 text-slate-400">
                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                          <span>Release Time:</span>
                        </span>
                        <span className="font-mono text-slate-300">
                          {releaseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({releaseDate.toLocaleDateString([], { month: 'short', day: 'numeric' })})
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center space-x-1.5 text-slate-400">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          <span>Expiry Time:</span>
                        </span>
                        <span className="font-mono text-slate-300">
                          {expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({expiryDate.toLocaleDateString([], { month: 'short', day: 'numeric' })})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="p-4 bg-slate-950/60 border-t border-slate-800/80">
                    <button
                      onClick={() => handleOpenPaper(paper)}
                      disabled={isQueueing}
                      className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 transition cursor-pointer ring-1 ring-white/10 ${
                        isAvailable
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-md shadow-blue-600/20'
                          : isUpcoming
                          ? 'bg-slate-800/80 text-amber-300 border border-slate-700/80'
                          : 'bg-slate-800/40 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isAvailable ? (
                        <>
                          <FileText className="h-4 w-4" />
                          <span>Open Examination Paper</span>
                        </>
                      ) : isUpcoming ? (
                        <>
                          <Clock className="h-4 w-4" />
                          <span>Not Released Yet</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          <span>Examination Ended</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* High-Traffic Queueing Dialog */}
      {isQueueing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="relative inline-flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 animate-spin">
                <Layers className="h-8 w-8" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                High Traffic Detected
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Your request is being processed. The CDN queue is routing your request to the nearest edge cache.
              </p>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-cyan-300 flex items-center justify-between">
              <span>Delivery Status:</span>
              <span className="font-bold flex items-center space-x-1.5 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Resolving PDF Stream</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      <PdfViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        paper={activePaper}
        blob={pdfBlob}
        cacheStatus={pdfCacheStatus}
        responseTimeMs={pdfResponseTime}
        etag={pdfEtag}
        currentUser={student}
      />
    </div>
  );
};
