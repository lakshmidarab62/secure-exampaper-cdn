import {
  CurrentUser,
  ExamPaperItem,
  MonitoringData,
  SimulationResultData,
  StagedPaperUpload
} from './types.js';

const TOKEN_KEY = 'secure_exam_cdn_auth_token';
const USER_KEY = 'secure_exam_cdn_auth_user';

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred during network request.';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const Api = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setAuth(token: string, user: CurrentUser) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  getSavedUser(): CurrentUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return apiRequest<T>(endpoint, options);
  },

  // Auth
  async loginStudent(reg_number: string, password: string) {
    const res = await apiRequest<{ token: string; user: CurrentUser }>('/api/auth/student/login', {
      method: 'POST',
      body: JSON.stringify({ reg_number, password })
    });
    this.setAuth(res.token, res.user);
    return res;
  },

  async registerStudent(data: {
    reg_number: string;
    name: string;
    email: string;
    department: string;
    semester: string;
    section: string;
    academic_year: string;
    password: string;
  }) {
    const res = await apiRequest<{ token: string; user: CurrentUser }>('/api/auth/student/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    this.setAuth(res.token, res.user);
    return res;
  },

  async loginFaculty(identifier: string, password: string) {
    const res = await apiRequest<{ token: string; user: CurrentUser }>('/api/auth/faculty/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
    this.setAuth(res.token, res.user);
    return res;
  },

  async registerFaculty(data: {
    faculty_id: string;
    name: string;
    email: string;
    department: string;
    designation: string;
    password: string;
  }) {
    const res = await apiRequest<{ token: string; user: CurrentUser }>('/api/auth/faculty/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    this.setAuth(res.token, res.user);
    return res;
  },

  async getCurrentUser() {
    return apiRequest<{ role: string; user: CurrentUser }>('/api/auth/me');
  },

  async updateStudentProfile(data: Partial<CurrentUser>) {
    return apiRequest<{ message: string; user: CurrentUser }>('/api/student/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async updateFacultyProfile(data: Partial<CurrentUser>) {
    return apiRequest<{ message: string; user: CurrentUser }>('/api/faculty/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Student papers
  async getStudentPapers() {
    return apiRequest<{ count: number; papers: ExamPaperItem[] }>('/api/student/papers');
  },

  // Student fetches PDF stream
  async fetchPaperBlob(paperId: string): Promise<{
    blob: Blob;
    cacheStatus: string | null;
    responseTimeMs: string | null;
    etag: string | null;
  }> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/student/papers/${paperId}/download`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      let errText = 'Failed to load paper';
      try {
        const errJson = await response.json();
        errText = errJson.error || errText;
      } catch {
        errText = `HTTP Error ${response.status}`;
      }
      throw new Error(errText);
    }

    const cacheStatus = response.headers.get('X-Cache-Status');
    const responseTimeMs = response.headers.get('X-Response-Time-Ms');
    const etag = response.headers.get('ETag');
    const blob = await response.blob();

    return { blob, cacheStatus, responseTimeMs, etag };
  },

  async checkQueueStatus(paperId: string) {
    return apiRequest<{
      queued: boolean;
      position: number;
      totalWaiting: number;
      estimatedWaitTimeSec: number;
    }>(`/api/student/papers/${paperId}/queue-status`);
  },

  // Faculty papers
  async getFacultyPapers() {
    return apiRequest<{ count: number; papers: ExamPaperItem[] }>('/api/faculty/papers');
  },

  async fetchFacultyPaperBlob(paperId: string): Promise<{
    blob: Blob;
    cacheStatus: string | null;
    responseTimeMs: string | null;
    etag: string | null;
  }> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/faculty/papers/${paperId}/preview`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      let errText = 'Failed to load paper preview';
      try {
        const errJson = await response.json();
        errText = errJson.error || errText;
      } catch {
        errText = `HTTP Error ${response.status}`;
      }
      throw new Error(errText);
    }

    const cacheStatus = response.headers.get('X-Cache-Status');
    const responseTimeMs = response.headers.get('X-Response-Time-Ms') || '2';
    const etag = response.headers.get('ETag');
    const blob = await response.blob();

    return { blob, cacheStatus, responseTimeMs, etag };
  },

  async uploadMultiplePapers(files: File[]) {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('papers', file);
    });

    return apiRequest<{
      message: string;
      successful_count: number;
      failed_count: number;
      papers: StagedPaperUpload[];
      failures: { file_name: string; error: string }[];
    }>('/api/faculty/papers/upload-multiple', {
      method: 'POST',
      body: formData
    });
  },

  async publishBatchPapers(papers: any[]) {
    return apiRequest<{ message: string; count: number; papers: ExamPaperItem[] }>(
      '/api/faculty/papers/publish-batch',
      {
        method: 'POST',
        body: JSON.stringify({ papers })
      }
    );
  },

  async updatePaper(paperId: string, updates: Partial<ExamPaperItem>) {
    return apiRequest<{ message: string; paper: ExamPaperItem }>(`/api/faculty/papers/${paperId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deletePaper(paperId: string) {
    return apiRequest<{ message: string }>(`/api/faculty/papers/${paperId}`, {
      method: 'DELETE'
    });
  },

  async prewarmPaper(paperId: string) {
    return apiRequest<{ success: boolean; message: string }>(`/api/faculty/papers/${paperId}/prewarm`, {
      method: 'POST'
    });
  },

  async prewarmAllPapers() {
    return apiRequest<{ success: boolean; message: string; warmed_count: number; total_count: number }>(
      '/api/faculty/papers/prewarm-all',
      { method: 'POST' }
    );
  },

  async generateSamplePapers() {
    return apiRequest<{ message: string; papers: ExamPaperItem[] }>('/api/faculty/generate-sample-papers', {
      method: 'POST'
    });
  },

  // Monitoring & Simulation
  async getRealtimeMetrics() {
    return apiRequest<MonitoringData>('/api/faculty/metrics/realtime');
  },

  async clearLogs() {
    return apiRequest<{ message: string }>('/api/faculty/metrics/clear-logs', {
      method: 'DELETE'
    });
  },

  async toggleCdn(enabled: boolean) {
    return apiRequest<{ message: string; enabled: boolean }>('/api/faculty/metrics/toggle-cdn', {
      method: 'POST',
      body: JSON.stringify({ enabled })
    });
  },

  async toggleQueue(enabled: boolean) {
    return apiRequest<{ message: string; enabled: boolean }>('/api/faculty/metrics/toggle-queue', {
      method: 'POST',
      body: JSON.stringify({ enabled })
    });
  },

  async runSimulation(config: {
    requestCount: number;
    optimized: boolean;
    paperId?: string;
    concurrency?: number;
  }) {
    return apiRequest<{ message: string; result: SimulationResultData }>('/api/simulation/run', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  },

  async seedDemoEnvironment() {
    return apiRequest<{
      message: string;
      demoStudent: any;
      demoFaculty: any;
      totalPapers: number;
    }>('/api/system/seed-demo', {
      method: 'POST'
    });
  },

  async resetAllAccounts() {
    return apiRequest<{ success: boolean; message: string }>('/api/auth/reset-all-accounts', {
      method: 'POST'
    });
  }
};
