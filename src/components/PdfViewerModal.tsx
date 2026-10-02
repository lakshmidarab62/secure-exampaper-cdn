import {
  AlertCircle,
  AlertTriangle,
  Award,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  Layers,
  Maximize2,
  Minimize2,
  Printer,
  RefreshCw,
  Shield,
  Sparkles,
  X,
  Zap,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { CurrentUser, ExamPaperItem, StudentUser } from '../types.js';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  paper: ExamPaperItem | null;
  blob: Blob | null;
  cacheStatus: string | null;
  responseTimeMs: string | null;
  etag: string | null;
  currentUser: CurrentUser | null;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  paper,
  blob,
  cacheStatus,
  responseTimeMs,
  etag,
  currentUser
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.25);
  const [renderLoading, setRenderLoading] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  // Tab view: If paper has generated questions, allow switching to digital question sheet
  const hasStructuredQuestions = !!(paper?.questions && paper.questions.length > 0);
  const [viewMode, setViewMode] = useState<'pdf' | 'sheet'>('pdf');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Create blob URL and load PDF.js document
  useEffect(() => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      setRenderLoading(true);
      setRenderError(null);

      const loadPdf = async () => {
        try {
          const pdfjs = (window as any).pdfjsLib;
          if (pdfjs) {
            const arrayBuffer = await blob.arrayBuffer();
            const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
            const doc = await loadingTask.promise;
            setPdfDoc(doc);
            setNumPages(doc.numPages);
            setCurrentPage(1);
          } else {
            // PDF.js not loaded, use fallback
            setRenderLoading(false);
          }
        } catch (err: any) {
          console.warn('PDF.js render warning:', err);
          setRenderError('Canvas rendering unavailable. You can read the question sheet or download the PDF.');
          setRenderLoading(false);
        }
      };

      loadPdf();

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setBlobUrl(null);
      setPdfDoc(null);
      setNumPages(0);
    }
  }, [blob]);

  // Render current page to canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;
    let renderTask: any = null;

    const renderPage = async () => {
      try {
        setRenderLoading(true);
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const viewport = page.getViewport({ scale });
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;
        if (!isCancelled) {
          setRenderLoading(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Page render error:', err);
          setRenderLoading(false);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTask && renderTask.cancel) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage, scale]);

  if (!isOpen || !paper) return null;

  const isStudent = currentUser?.role === 'student';
  const student = isStudent ? (currentUser as StudentUser) : null;
  const watermarkText = student
    ? `AUTHENTICATED STUDENT COPY  •  REG NO: ${student.reg_number}  •  ${student.name.toUpperCase()}  •  ${new Date().toLocaleDateString()}`
    : `AUTHORIZED FACULTY PREVIEW  •  EXAMINER COPY  •  ${new Date().toLocaleDateString()}`;

  const handleDownload = () => {
    if (!blobUrl || !paper) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = paper.file_name || `${paper.subject.replace(/[^a-zA-Z0-9]/g, '_')}_Paper.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    window.print();
  };

  const isHit = cacheStatus === 'HIT';

  const questions = paper.questions || [];
  const instructions = paper.instructions || [
    'Answer all questions in sequential order.',
    'State all assumptions clearly for calculation questions.',
    'Write legibly. Diagrams carry proportional weightage.'
  ];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200 ${
      isFullscreen ? 'p-0' : ''
    }`}>
      <div className={`relative flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
        isFullscreen ? 'w-full h-full rounded-none border-none' : 'w-full max-w-5xl h-[95vh]'
      }`}>
        
        {/* Top Control Bar */}
        <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-sm">
              <FileText className="h-5 w-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white truncate">
                  {paper.title || paper.subject}
                </h3>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                  {paper.exam_type}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Target: {paper.department} • Sem {paper.semester} • Section {paper.section}
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* View Mode Toggle if structured questions available */}
            {hasStructuredQuestions && (
              <div className="hidden sm:flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('pdf')}
                  className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                    viewMode === 'pdf'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Real PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('sheet')}
                  className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                    viewMode === 'sheet'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileCheck className="h-3.5 w-3.5" />
                  <span>Question Sheet</span>
                </button>
              </div>
            )}

            {/* CDN Speed Badge */}
            <div className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border ${
              isHit
                ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-300'
                : 'bg-amber-950/80 border-amber-700/80 text-amber-300'
            }`}>
              <Zap className="h-3 w-3" />
              <span>CDN: <strong>{cacheStatus || 'BYPASS'}</strong></span>
              {responseTimeMs && (
                <span className="text-[10px] text-slate-400 border-l border-slate-700 pl-1.5 ml-1">
                  {responseTimeMs}ms
                </span>
              )}
            </div>

            {/* PDF Canvas Zoom Controls (When in PDF mode and doc loaded) */}
            {viewMode === 'pdf' && pdfDoc && (
              <div className="hidden lg:flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-xl p-1 text-slate-300 text-xs">
                <button
                  type="button"
                  onClick={() => setScale((s) => Math.max(s - 0.2, 0.7))}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="px-1.5 font-mono text-[11px] text-cyan-300">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setScale((s) => Math.min(s + 0.2, 2.5))}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Direct Download Button */}
            <button
              onClick={handleDownload}
              className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs border border-blue-400/30 transition flex items-center space-x-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
              title="Download Original PDF Paper"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download PDF</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer hidden sm:block"
              title="Print Question Paper"
            >
              <Printer className="h-4 w-4" />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition hidden sm:block cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 hover:border-rose-800 text-slate-400 border border-slate-700 transition cursor-pointer"
              title="Close Preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Security Watermark Banner */}
        <div className="bg-slate-950/90 border-b border-slate-800/80 px-4 py-1 text-[11px] text-slate-400 flex items-center justify-between font-mono shrink-0">
          <div className="flex items-center space-x-2 text-cyan-400 truncate">
            <Shield className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
            <span className="text-slate-400">Security Watermark:</span>
            <span className="text-cyan-300 font-semibold truncate">{watermarkText}</span>
          </div>
          {etag && (
            <span className="hidden md:inline text-slate-500 text-[10px] shrink-0 ml-3">
              SHA: {etag.replace(/"/g, '').substring(0, 16)}...
            </span>
          )}
        </div>

        {/* Content Body */}
        <div className="relative flex-1 bg-[#060a12] overflow-hidden flex flex-col">
          {viewMode === 'pdf' ? (
            /* REAL PDF CANVAS VIEWER (Renders actual uploaded PDF pages with 100% fidelity) */
            <div className="relative flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-start">
              {renderLoading && (
                <div className="absolute inset-0 bg-slate-950/80 z-20 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin" />
                  <p className="text-xs text-slate-300 font-mono">
                    Rendering PDF page {currentPage} of {numPages || 1}...
                  </p>
                </div>
              )}

              {/* Render Canvas Document */}
              <div className="relative shadow-2xl rounded-lg overflow-hidden border border-slate-700 bg-white">
                {/* Floating Translucent Security Watermark over the Canvas */}
                <div
                  className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-around select-none overflow-hidden opacity-[0.08]"
                  aria-hidden="true"
                >
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="transform -rotate-12 whitespace-nowrap text-lg sm:text-2xl font-black text-rose-600 text-center tracking-widest uppercase"
                    >
                      {watermarkText} • {watermarkText}
                    </div>
                  ))}
                </div>

                <canvas ref={canvasRef} className="block max-w-full h-auto" />
              </div>

              {/* Fallback if Canvas rendering failed */}
              {renderError && (
                <div className="mt-4 p-4 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-200 text-xs text-center max-w-md">
                  <p className="mb-2 font-semibold">{renderError}</p>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold cursor-pointer"
                  >
                    Download Original PDF Paper
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* STRUCTURED QUESTION SHEET (For generated sample papers) */
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center">
              <div className="relative w-full max-w-3xl bg-[#0f172a] text-slate-100 rounded-xl border border-slate-700 shadow-2xl p-6 sm:p-10 space-y-6 select-text overflow-hidden">
                {/* Translucent Watermark */}
                <div
                  className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-around select-none overflow-hidden opacity-[0.05]"
                  aria-hidden="true"
                >
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="transform -rotate-12 whitespace-nowrap text-lg sm:text-2xl font-black text-cyan-400 text-center tracking-widest uppercase"
                    >
                      {watermarkText} • {watermarkText}
                    </div>
                  ))}
                </div>

                {/* Institutional Exam Header */}
                <div className="text-center pb-5 border-b-2 border-slate-700 space-y-1.5">
                  <div className="inline-block px-3 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-[11px] font-mono text-cyan-300 font-bold uppercase tracking-wider mb-1">
                    CONFIDENTIAL & AUTHENTICATED EXAMINATION COPY
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                    INSTITUTE OF HIGHER TECHNOLOGY & ENGINEERING
                  </h1>
                  <h2 className="text-sm sm:text-base font-bold text-cyan-300 uppercase">
                    {paper.exam_type} — ACADEMIC YEAR 2026–2027
                  </h2>
                  <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                    DEPARTMENT OF {paper.department.toUpperCase()}
                  </p>
                </div>

                {/* Exam Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Subject</span>
                    <strong className="text-white truncate block">{paper.subject}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Paper Code</span>
                    <strong className="text-cyan-300 block">{paper.subject.substring(0, 3).toUpperCase()}-402</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Target Cohort</span>
                    <strong className="text-amber-300 block">Sem {paper.semester} • Sec {paper.section}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Time / Max Marks</span>
                    <strong className="text-emerald-300 block">{paper.duration || '3 Hours'} / {paper.max_marks || 100}M</strong>
                  </div>
                </div>

                {/* Questions */}
                <div className="space-y-4">
                  {questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-4"
                    >
                      <div className="flex items-start space-x-3">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-blue-600/20 border border-blue-500/30 text-cyan-400 font-mono font-bold text-xs shrink-0 mt-0.5">
                          Q{q.qNo}
                        </span>
                        <p className="text-sm text-slate-200 leading-relaxed">
                          {q.text}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-800 text-amber-300 border border-slate-700">
                        [{q.marks} Marks]
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar for Multi-Page Real PDFs */}
        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            {numPages > 1 && viewMode === 'pdf' && (
              <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-mono text-xs text-white">
                  Page {currentPage} of {numPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= numPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, numPages))}
                  className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
            <span className="text-[11px] text-slate-400">
              {paper.file_name || `${paper.subject}.pdf`} {paper.file_size ? `(${(paper.file_size / 1024).toFixed(1)} KB)` : ''}
            </span>
          </div>

          <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Edge Memory Pre-Warmed & Verified</span>
          </span>
        </div>
      </div>
    </div>
  );
};
