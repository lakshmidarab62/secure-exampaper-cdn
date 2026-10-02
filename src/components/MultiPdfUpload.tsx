import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  FileUp,
  FolderUp,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { Api } from '../api.js';
import { StagedPaperUpload } from '../types.js';

interface MultiPdfUploadProps {
  onPublishSuccess: () => void;
  onCancel: () => void;
}

export const MultiPdfUpload: React.FC<MultiPdfUploadProps> = ({
  onPublishSuccess,
  onCancel
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [stagedPapers, setStagedPapers] = useState<StagedPaperUpload[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // File selection
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const validPdfs: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        if (file.size <= 100 * 1024 * 1024) {
          validPdfs.push(file);
        } else {
          errors.push(`${file.name}: Exceeds 100MB file size limit.`);
        }
      } else {
        errors.push(`${file.name}: Not a PDF document.`);
      }
    });

    if (errors.length > 0) {
      setUploadError(errors.join(' '));
    } else {
      setUploadError(null);
    }

    setSelectedFiles(prev => [...prev, ...validPdfs]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload and auto-detect metadata
  const handleProcessUploads = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      const res = await Api.uploadMultiplePapers(selectedFiles);
      setStagedPapers(res.papers);
      setSelectedFiles([]); // clear raw file queue
      if (res.failed_count > 0) {
        setUploadError(`Note: ${res.failed_count} file(s) failed during processing.`);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to process PDF uploads.');
    } finally {
      setIsUploading(false);
    }
  };

  // Update metadata for a staged paper
  const handleUpdateStagedField = (
    index: number,
    field: string,
    value: any
  ) => {
    setStagedPapers(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        detected_metadata: {
          ...copy[index].detected_metadata,
          [field]: value
        }
      };
      return copy;
    });
  };

  const removeStagedPaper = (index: number) => {
    setStagedPapers(prev => prev.filter((_, i) => i !== index));
  };

  // Final Publish
  const handlePublishAll = async () => {
    if (stagedPapers.length === 0) return;
    setIsPublishing(true);
    setUploadError(null);

    try {
      const papersToPublish = stagedPapers.map(sp => ({
        temp_file_path: sp.temp_file_path,
        file_name: sp.file_name,
        file_size: sp.file_size,
        file_hash: sp.file_hash,
        title: sp.detected_metadata.title,
        subject: sp.detected_metadata.subject,
        department: sp.detected_metadata.department,
        semester: sp.detected_metadata.semester,
        section: sp.detected_metadata.section,
        exam_type: sp.detected_metadata.exam_type,
        page_count: sp.detected_metadata.page_count,
        release_time: sp.detected_metadata.release_time,
        expiry_time: sp.detected_metadata.expiry_time,
        is_student_specific: sp.detected_metadata.is_student_specific,
        specific_reg_numbers: sp.detected_metadata.specific_reg_numbers
      }));

      await Api.publishBatchPapers(papersToPublish);
      onPublishSuccess();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to publish examination papers.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Instant sample papers generator
  const handleGenerateSamples = async () => {
    setIsPublishing(true);
    setUploadError(null);
    try {
      await Api.generateSamplePapers();
      onPublishSuccess();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to generate sample papers');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <FolderUp className="h-6 w-6 text-purple-400" />
            <span>Multiple Examination Papers Upload</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatic metadata extraction and student cohort mapping.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleGenerateSamples}
            disabled={isPublishing}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Generate 3 Sample Papers</span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
          >
            Cancel
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Stage 1: File Selection Dropzone */}
      {stagedPapers.length === 0 ? (
        <div className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-10 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-purple-500 bg-purple-950/20'
                : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />

            <div className="inline-flex p-4 rounded-full bg-purple-600/10 border border-purple-500/20 text-purple-400 mb-3">
              <FileUp className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Select or Drop Multiple Examination Papers
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Choose up to 100 PDF files simultaneously. Maximum 100MB per paper.
            </p>
          </div>

          {/* Selected files queue */}
          {selectedFiles.length > 0 && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Selected Files ({selectedFiles.length})</span>
                <button
                  type="button"
                  onClick={() => setSelectedFiles([])}
                  className="text-rose-400 hover:text-rose-300"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <FileText className="h-4 w-4 text-purple-400 shrink-0" />
                      <span className="text-slate-200 truncate">{file.name}</span>
                      <span className="text-slate-500 shrink-0 font-mono">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSelectedFile(idx)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleProcessUploads}
                disabled={isUploading}
                className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-purple-600/20"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Analyzing & Extracting Paper Metadata...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Upload & Auto-Detect Metadata ({selectedFiles.length} files)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Stage 2: Review & Edit Metadata Screen */
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/40 flex items-center justify-between text-xs text-purple-200">
            <span className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-purple-400" />
              <span>
                <strong>{stagedPapers.length} paper(s) staged.</strong> Review detected subjects and target student groups before final publication.
              </span>
            </span>
            <button
              onClick={() => { setStagedPapers([]); setSelectedFiles([]); }}
              className="text-purple-300 hover:text-white underline"
            >
              Upload Different Files
            </button>
          </div>

          {/* Cards for each staged paper */}
          <div className="space-y-4">
            {stagedPapers.map((paper, idx) => {
              const meta = paper.detected_metadata;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
                      <FileText className="h-4 w-4 text-purple-400" />
                      <span className="text-white font-bold">{paper.original_name}</span>
                      <span>({(paper.file_size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStagedPaper(idx)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                      title="Discard this paper"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Subject Title</label>
                      <input
                        type="text"
                        value={meta.subject}
                        onChange={(e) => handleUpdateStagedField(idx, 'subject', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Target Department</label>
                      <input
                        type="text"
                        list={`depts-list-${idx}`}
                        value={meta.department}
                        onChange={(e) => handleUpdateStagedField(idx, 'department', e.target.value)}
                        placeholder="e.g. Computer Science or ALL"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                      />
                      <datalist id={`depts-list-${idx}`}>
                        <option value="Computer Science" />
                        <option value="Information Technology" />
                        <option value="Electronics & Communication" />
                        <option value="Electrical & Electronics" />
                        <option value="Mechanical Engineering" />
                        <option value="Civil Engineering" />
                        <option value="Data Science & AI" />
                        <option value="ALL" />
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Semester</label>
                      <select
                        value={meta.semester}
                        onChange={(e) => handleUpdateStagedField(idx, 'semester', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                      >
                        <option value="ALL">ALL Semesters</option>
                        <option value="1">Sem 1</option>
                        <option value="2">Sem 2</option>
                        <option value="3">Sem 3</option>
                        <option value="4">Sem 4</option>
                        <option value="5">Sem 5</option>
                        <option value="6">Sem 6</option>
                        <option value="7">Sem 7</option>
                        <option value="8">Sem 8</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Section (Any format)</label>
                      <input
                        type="text"
                        list={`sections-list-${idx}`}
                        value={meta.section}
                        onChange={(e) => handleUpdateStagedField(idx, 'section', e.target.value)}
                        placeholder="e.g. A, B, CSE-A, or ALL"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                      />
                      <datalist id={`sections-list-${idx}`}>
                        <option value="ALL" />
                        <option value="A" />
                        <option value="B" />
                        <option value="C" />
                        <option value="D" />
                        <option value="CSE-A" />
                        <option value="CSE-B" />
                      </datalist>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Exam Type</label>
                      <select
                        value={meta.exam_type}
                        onChange={(e) => handleUpdateStagedField(idx, 'exam_type', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                      >
                        <option value="Midterm Examination">Midterm Examination</option>
                        <option value="End-Semester Examination">End-Semester Examination</option>
                        <option value="Surprise Quiz">Surprise Quiz</option>
                        <option value="Laboratory Practical Exam">Laboratory Practical Exam</option>
                        <option value="Continuous Assessment">Continuous Assessment</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Release Time (Availability Start)</label>
                      <input
                        type="datetime-local"
                        value={meta.release_time ? meta.release_time.substring(0, 16) : ''}
                        onChange={(e) => handleUpdateStagedField(idx, 'release_time', new Date(e.target.value).toISOString())}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Expiry Time (Availability End)</label>
                      <input
                        type="datetime-local"
                        value={meta.expiry_time ? meta.expiry_time.substring(0, 16) : ''}
                        onChange={(e) => handleUpdateStagedField(idx, 'expiry_time', new Date(e.target.value).toISOString())}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action to publish batch */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePublishAll}
              disabled={isPublishing}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-lg shadow-purple-600/20 transition flex items-center space-x-2 cursor-pointer"
            >
              {isPublishing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Publishing & Pre-Warming CDN...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Publish All {stagedPapers.length} Papers</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
