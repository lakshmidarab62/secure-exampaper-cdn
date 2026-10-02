export interface StudentUser {
  id: string;
  role: 'student';
  reg_number: string;
  name: string;
  email: string;
  department: string;
  semester: string;
  section: string;
  academic_year: string;
}

export interface FacultyUser {
  id: string;
  role: 'faculty';
  faculty_id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
}

export type CurrentUser = StudentUser | FacultyUser;

export interface ExamPaperItem {
  id: string;
  title: string;
  subject: string;
  department: string;
  semester: string;
  section: string;
  exam_type: string;
  exam_date: string;
  release_time: string;
  expiry_time: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  page_count?: number;
  access_status?: 'upcoming' | 'available' | 'expired';
  uploaded_by_name?: string;
  status?: 'draft' | 'published' | 'archived';
  is_student_specific?: boolean;
  specific_reg_numbers?: string[];
  instructions?: string[];
  questions?: { qNo: string; text: string; marks: number }[];
  duration?: string;
  max_marks?: number;
  created_at?: string;
}

export interface AccessLogItem {
  id: string;
  paper_id: string;
  paper_title: string;
  student_id: string;
  student_reg_no: string;
  timestamp: string;
  status: 'SUCCESS' | 'QUEUED' | 'BLOCKED_UNRELEASED' | 'BLOCKED_EXPIRED' | 'UNAUTHORIZED';
  response_time_ms: number;
  cache_status: 'HIT' | 'MISS' | 'BYPASS';
  client_ip: string;
}

export interface CacheStats {
  enabled: boolean;
  totalHits: number;
  totalMisses: number;
  totalRequests: number;
  hitRatePercent: number;
  cachedPaperCount: number;
  cachedTotalSizeBytes: number;
  avgCacheLatencyMs: number;
  avgOriginLatencyMs: number;
  bandwidthSavedBytes: number;
  frequentlyAccessed: {
    paperId: string;
    title: string;
    hits: number;
    size: number;
    lastAccessed: string;
  }[];
}

export interface QueueMetrics {
  enabled: boolean;
  concurrencyLimit: number;
  activeProcessingCount: number;
  currentQueueLength: number;
  totalReceived: number;
  totalProcessed: number;
  totalTimedOut: number;
  avgWaitTimeMs: number;
  avgProcessTimeMs: number;
  estimatedWaitTimeSec: number;
}

export interface MonitoringData {
  system: {
    totalPapers: number;
    totalStudents: number;
    totalFaculty: number;
    serverTime: string;
  };
  cache: CacheStats;
  queue: QueueMetrics;
  traffic: {
    totalRequests: number;
    successfulRequests: number;
    blockedRequests: number;
    unauthorizedRequests: number;
    avgResponseTimeMs: number;
  };
  recentLogs: AccessLogItem[];
}

export interface StagedPaperUpload {
  temp_file_path: string;
  file_name: string;
  file_size: number;
  file_hash: string;
  original_name: string;
  detected_metadata: {
    title: string;
    subject: string;
    department: string;
    semester: string;
    section: string;
    exam_type: string;
    page_count: number;
    is_student_specific: boolean;
    specific_reg_numbers: string[];
    release_time: string;
    expiry_time: string;
  };
}

export interface SimulationResultData {
  simulationId: string;
  totalRequests: number;
  completedRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  avgResponseTimeMs: number;
  p95ResponseTimeMs: number;
  peakResponseTimeMs: number;
  requestsPerSecond: number;
  currentQueueSize: number;
  elapsedMs: number;
  isComplete: boolean;
  optimized: boolean;
  systemMetrics: {
    originDiskReads: number;
    cdnBandwidthServedMb: number;
    activeConcurrency: number;
  };
  summary?: {
    durationMs: number;
    efficiencyGainPercent: number;
    avgLatencyReductionPercent: number;
  };
}
