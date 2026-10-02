import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  FilePlus,
  FileText,
  Filter,
  Flame,
  FolderUp,
  HardDrive,
  LayoutGrid,
  Layers,
  List,
  Plus,
  RefreshCw,
  Search,
  Server,
  Sparkles,
  Trash2,
  Users,
  X,
  Zap
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Api } from '../api.js';
import { ExamPaperItem, FacultyUser } from '../types.js';
import { LiveMonitoring } from './LiveMonitoring.js';
import { MultiPdfUpload } from './MultiPdfUpload.js';
import { PdfViewerModal } from './PdfViewerModal.js';
import { TrafficSimulator } from './TrafficSimulator.js';

interface FacultyDashboardProps {
  faculty: FacultyUser;
  onOpenProfile: () => void;
}

export const FacultyDashboard: React.FC<FacultyDashboardProps> = ({
  faculty,
  onOpenProfile
}) => {
  const [activeTab, setActiveTab] = useState<'papers' | 'upload' | 'monitoring' | 'simulation'>('papers');
  const [papers, setPapers] = useState<ExamPaperItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'upcoming' | 'expired'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Paper preview state
  const [previewPaper, setPreviewPaper] = useState<ExamPaperItem | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewCacheStatus, setPreviewCacheStatus] = useState<string | null>(null);
  const [previewResponseTime, setPreviewResponseTime] = useState<string | null>(null);
  const [previewEtag, setPreviewEtag] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);

  // Status message for actions
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchPapers = async () => {
    setLoading(true);
    try {
      const res = await Api.getFacultyPapers();
      setPapers(res.papers);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch examination papers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, []);

  const handleOpenPaperPreview = async (paper: ExamPaperItem) => {
    setLoadingPreviewId(paper.id);
    setError(null);
    try {
      const res = await Api.fetchFacultyPaperBlob(paper.id);
      setPreviewPaper(paper);
      setPreviewBlob(res.blob);
      setPreviewCacheStatus(res.cacheStatus);
      setPreviewResponseTime(res.responseTimeMs);
      setPreviewEtag(res.etag);
      setIsViewerOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to open paper preview.');
    } finally {
      setLoadingPreviewId(null);
    }
  };

  const handlePrewarm = async (paper: ExamPaperItem) => {
    try {
      await Api.prewarmPaper(paper.id);
      setActionNotice(`CDN Cache Pre-Warmed: ${paper.subject} is now cached in Edge memory.`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Prewarm failed');
    }
  };

  const [isPrewarmingAll, setIsPrewarmingAll] = useState(false);

  const handlePrewarmAll = async () => {
    setIsPrewarmingAll(true);
    try {
      const res = await Api.prewarmAllPapers();
      setActionNotice(`CDN Pre-Warmed: ${res.warmed_count} papers cached in Edge RAM ready for 20,000 students.`);
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to pre-warm all papers');
    } finally {
      setIsPrewarmingAll(false);
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeletePaper = async (paperId: string) => {
    try {
      await Api.deletePaper(paperId);
      setActionNotice('Examination paper deleted successfully.');
      setConfirmDeleteId(null);
      setTimeout(() => setActionNotice(null), 3000);
      fetchPapers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete paper');
    }
  };

  const handleGenerateSamplePapers = async () => {
    try {
      setLoading(true);
      await Api.generateSamplePapers();
      setActionNotice('Generated and published 3 authentic academic exam papers with questions.');
      setTimeout(() => setActionNotice(null), 4000);
      fetchPapers();
    } catch (err: any) {
      setError(err.message || 'Failed to generate sample papers');
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();

  const filteredPapers = papers.filter(p => {
    const matchesSearch =
      p.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const releaseDate = new Date(p.release_time);
    const expiryDate = new Date(p.expiry_time);

    if (statusFilter === 'available') {
      return now >= releaseDate && now <= expiryDate;
    } else if (statusFilter === 'upcoming') {
      return now < releaseDate;
    } else if (statusFilter === 'expired') {
      return now > expiryDate;
    }
    return true;
  });

  const availableCount = papers.filter(p => now >= new Date(p.release_time) && now <= new Date(p.expiry_time)).length;
  const upcomingCount = papers.filter(p => now < new Date(p.release_time)).length;
  const expiredCount = papers.filter(p => now > new Date(p.expiry_time)).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Faculty Profile Banner */}
      <div className="glass-panel relative overflow-hidden rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex items-center space-x-2 text-xs text-purple-300">
              <span className="font-semibold">Examination Authority & Distribution Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {faculty.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono text-slate-300">
              <span className="px-3 py-1 rounded-lg bg-slate-950/80 border border-slate-700/80 text-purple-300 font-bold">
                Faculty ID: {faculty.faculty_id}
              </span>
              <span className="px-3 py-1 rounded-lg bg-slate-950/80 border border-slate-700/80">
                {faculty.designation}
              </span>
              <span className="px-3 py-1 rounded-lg bg-slate-950/80 border border-slate-700/80">
                Department: {faculty.department}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveTab('upload')}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/25 transition flex items-center space-x-2 cursor-pointer ring-1 ring-white/10"
            >
              <FilePlus className="h-4 w-4" />
              <span>Upload Papers</span>
            </button>

            <button
              onClick={handleGenerateSamplePapers}
              className="px-3.5 py-2.5 rounded-xl bg-slate-850 hover:bg-slate-750 text-cyan-300 text-xs font-semibold border border-slate-700/80 transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
              title="Generate full academic sample PDFs with questions"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Add Sample Papers</span>
            </button>

            <button
              onClick={handlePrewarmAll}
              disabled={isPrewarmingAll || papers.length === 0}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              title="Pre-load all papers into Edge CDN RAM for instant access during 20,000 student release"
            >
              <Zap className={`h-4 w-4 ${isPrewarmingAll ? 'animate-spin' : ''}`} />
              <span>{isPrewarmingAll ? 'Pre-Warming...' : 'Pre-Warm All in RAM'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Notification */}
      {actionNotice && (
        <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-800/70 text-emerald-200 text-xs flex items-center space-x-2.5 animate-in fade-in shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-800/70 text-rose-200 text-xs flex items-center space-x-2.5 shadow-lg">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800/80 space-x-4 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('papers')}
          className={`pb-3 border-b-2 transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'papers'
              ? 'border-purple-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4 text-purple-400" />
          <span>Exam Papers Repository ({papers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`pb-3 border-b-2 transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'upload'
              ? 'border-purple-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderUp className="h-4 w-4 text-blue-400" />
          <span>Multiple PDF Upload</span>
        </button>

        <button
          onClick={() => setActiveTab('monitoring')}
          className={`pb-3 border-b-2 transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'monitoring'
              ? 'border-purple-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="h-4 w-4 text-emerald-400" />
          <span>Live CDN & Queue Monitoring</span>
        </button>

        <button
          onClick={() => setActiveTab('simulation')}
          className={`pb-3 border-b-2 transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'simulation'
              ? 'border-purple-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="h-4 w-4 text-amber-400" />
          <span>Traffic Simulation Demo</span>
        </button>
      </div>

      {/* Tab 1: Exam Papers Repository */}
      {activeTab === 'papers' && (
        <div className="space-y-6">
          {/* Header & Filter Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">
                Exam Papers Repository & Cohort Distribution
              </h2>
              <p className="text-xs text-slate-400">
                Manage paper cohorts and Edge CDN cache pre-warming.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter Tabs */}
              <div className="flex items-center p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-medium ${
                    statusFilter === 'all' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({papers.length})
                </button>
                <button
                  onClick={() => setStatusFilter('available')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-medium ${
                    statusFilter === 'available' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Active ({availableCount})
                </button>
                <button
                  onClick={() => setStatusFilter('upcoming')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-medium ${
                    statusFilter === 'upcoming' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Upcoming ({upcomingCount})
                </button>
                <button
                  onClick={() => setStatusFilter('expired')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-medium ${
                    statusFilter === 'expired' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Expired ({expiredCount})
                </button>
              </div>

              {/* View Switcher: Grid vs Table */}
              <div className="flex items-center p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === 'grid' ? 'bg-slate-800 text-white' : 'hover:text-white'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === 'table' ? 'bg-slate-800 text-white' : 'hover:text-white'
                  }`}
                  title="Table View"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Search */}
              <div className="relative w-48 sm:w-60">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter subject/dept..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                />
              </div>

              <button
                onClick={fetchPapers}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition shadow-sm cursor-pointer"
                title="Refresh list"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="glass-panel p-12 text-center rounded-2xl">
              <RefreshCw className="h-6 w-6 animate-spin text-purple-400 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Loading examination papers...</p>
            </div>
          ) : filteredPapers.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl border-dashed space-y-3.5">
              <div className="h-12 w-12 rounded-2xl bg-purple-600/15 border border-purple-500/25 flex items-center justify-center text-purple-400 mx-auto">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-200">
                {papers.length === 0 ? 'No Examination Papers Uploaded Yet' : 'No Papers Match Current Filter'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {papers.length === 0
                  ? 'Your repository is currently empty. Upload your examination PDF documents to configure target cohorts and release schedules for students.'
                  : 'No examination papers found matching your search or status criteria. Try clearing the filter or search term.'}
              </p>
              <div className="flex items-center justify-center space-x-3 pt-2">
                <button
                  onClick={() => setActiveTab('upload')}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition cursor-pointer shadow-lg shadow-purple-600/25 ring-1 ring-white/10"
                >
                  Upload Multiple PDFs
                </button>
                {papers.length === 0 && (
                  <button
                    onClick={handleGenerateSamplePapers}
                    className="px-4 py-2.5 rounded-xl bg-slate-850 hover:bg-slate-750 text-cyan-300 text-xs font-semibold border border-slate-700/80 transition cursor-pointer"
                  >
                    Add Sample Papers
                  </button>
                )}
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            /* Enhanced Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPapers.map((paper) => {
                const releaseDate = new Date(paper.release_time);
                const expiryDate = new Date(paper.expiry_time);
                const isActive = now >= releaseDate && now <= expiryDate;
                const isUpcoming = now < releaseDate;
                const isExpired = now > expiryDate;

                return (
                  <div
                    key={paper.id}
                    className="glass-card flex flex-col justify-between rounded-2xl p-5 space-y-4 hover:border-purple-500/40"
                  >
                    <div className="space-y-3.5">
                      {/* Status & Exam Type */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-purple-300 truncate">
                          {paper.exam_type}
                        </span>
                        {isActive && (
                          <span className="inline-flex items-center space-x-1.5 text-[11px] font-bold text-emerald-400">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Live & Available</span>
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
                            Access Expired
                          </span>
                        )}
                      </div>

                      {/* Subject Title */}
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

                      {/* Target Eligibility Mapping */}
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="flex items-center space-x-1">
                            <Users className="h-3.5 w-3.5 text-cyan-400" />
                            <span>Target Cohort:</span>
                          </span>
                          <span className="font-mono text-cyan-300 font-semibold">
                            {paper.department}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                          <span>Semester: {paper.semester}</span>
                          <span className="text-amber-300">Section: {paper.section}</span>
                        </div>
                      </div>

                      {/* Time Window */}
                      <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/50 text-[11px] space-y-1 text-slate-400 font-mono">
                        <div className="flex justify-between">
                          <span>Releases:</span>
                          <span className="text-slate-300">{releaseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({releaseDate.toLocaleDateString([], { month: 'short', day: 'numeric' })})</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Expires:</span>
                          <span className="text-slate-300">{expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({expiryDate.toLocaleDateString([], { month: 'short', day: 'numeric' })})</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        {/* Open Paper PDF */}
                        <button
                          onClick={() => handleOpenPaperPreview(paper)}
                          disabled={loadingPreviewId === paper.id}
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer shadow-md shadow-blue-600/20"
                          title="Open & Preview actual examination PDF"
                        >
                          {loadingPreviewId === paper.id ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                          <span>Preview PDF</span>
                        </button>

                        {/* Pre-warm in CDN */}
                        <button
                          onClick={() => handlePrewarm(paper)}
                          className="px-3 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/60 text-emerald-300 text-xs font-medium transition flex items-center space-x-1 cursor-pointer"
                          title="Pre-load in Edge CDN Memory"
                        >
                          <Zap className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Pre-Warm</span>
                        </button>
                      </div>

                      {/* Delete */}
                      {confirmDeleteId === paper.id ? (
                        <div className="flex items-center space-x-1.5 animate-in fade-in">
                          <button
                            onClick={() => handleDeletePaper(paper.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shadow-md transition cursor-pointer"
                            title="Confirm permanent deletion"
                          >
                            Confirm Delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                            title="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(paper.id)}
                          className="p-2 rounded-xl bg-slate-950 hover:bg-rose-950 hover:text-rose-400 text-slate-500 border border-slate-800 transition cursor-pointer"
                          title="Delete Paper"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3">Subject / Paper Title</th>
                      <th className="px-4 py-3">Target Cohort</th>
                      <th className="px-4 py-3">Exam Type</th>
                      <th className="px-4 py-3">Release Window</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredPapers.map((paper) => {
                      const releaseDate = new Date(paper.release_time);
                      const expiryDate = new Date(paper.expiry_time);
                      const isActive = now >= releaseDate && now <= expiryDate;
                      const isUpcoming = now < releaseDate;

                      return (
                        <tr key={paper.id} className="hover:bg-slate-850/40 transition">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-white">{paper.subject}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {paper.file_name} · {paper.file_size ? `${(paper.file_size / 1024).toFixed(1)} KB` : ''}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-slate-300">
                            <div>{paper.department}</div>
                            <div className="text-[11px] text-slate-400">
                              Sem {paper.semester} · Sec <span className="text-amber-300 font-bold">{paper.section}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-purple-300 font-medium">
                            {paper.exam_type}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-[11px] text-slate-300">
                            <div>{releaseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({releaseDate.toLocaleDateString([], { month: 'short', day: 'numeric' })})</div>
                            <div className="text-slate-500">to {expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({expiryDate.toLocaleDateString([], { month: 'short', day: 'numeric' })})</div>
                          </td>
                          <td className="px-4 py-3.5">
                            {isActive ? (
                              <span className="text-emerald-400 font-bold inline-flex items-center space-x-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span>Live</span>
                              </span>
                            ) : isUpcoming ? (
                              <span className="text-amber-400 font-bold">Scheduled</span>
                            ) : (
                              <span className="text-slate-500 font-medium">Expired</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right space-x-2">
                            <button
                              onClick={() => handleOpenPaperPreview(paper)}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition cursor-pointer inline-flex items-center space-x-1"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => handlePrewarm(paper)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300 transition cursor-pointer"
                              title="Pre-warm CDN"
                            >
                              <Zap className="h-3.5 w-3.5" />
                            </button>
                            {confirmDeleteId === paper.id ? (
                              <span className="inline-flex items-center space-x-1">
                                <button
                                  onClick={() => handleDeletePaper(paper.id)}
                                  className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(paper.id)}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 transition cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Multiple PDF Upload */}
      {activeTab === 'upload' && (
        <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-2xl">
          <MultiPdfUpload
            onPublishSuccess={() => {
              setActiveTab('papers');
              fetchPapers();
              setActionNotice('All staged examination papers published and cached successfully.');
              setTimeout(() => setActionNotice(null), 4000);
            }}
            onCancel={() => setActiveTab('papers')}
          />
        </div>
      )}

      {/* Tab 3: Live Monitoring */}
      {activeTab === 'monitoring' && (
        <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-2xl">
          <LiveMonitoring />
        </div>
      )}

      {/* Tab 4: Traffic Simulation Benchmark */}
      {activeTab === 'simulation' && (
        <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-2xl">
          <TrafficSimulator papers={papers} />
        </div>
      )}

      {/* Built-in PDF Viewer Modal for Faculty Inspection */}
      <PdfViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        paper={previewPaper}
        blob={previewBlob}
        cacheStatus={previewCacheStatus}
        responseTimeMs={previewResponseTime}
        etag={previewEtag}
        currentUser={faculty}
      />
    </div>
  );
};
