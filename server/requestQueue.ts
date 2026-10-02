import { db } from './db.js';

export interface QueuedRequest<T = any> {
  id: string;
  studentId: string;
  studentRegNo: string;
  paperId: string;
  createdAt: number;
  priority: number; // lower number = higher priority
  execute: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  status: 'WAITING' | 'PROCESSING' | 'COMPLETED' | 'TIMEOUT';
}

export interface QueueStatusMetrics {
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

class RequestQueueService {
  private queue: QueuedRequest[] = [];
  private activeCount: number = 0;
  private concurrencyLimit: number = 500; // Ultra high-concurrency worker pool for 20,000 students
  private isEnabled: boolean = true;
  private queueTimeoutMs: number = 45000; // 45s timeout under extreme surges

  // Metrics
  private totalReceived: number = 0;
  private totalProcessed: number = 0;
  private totalTimedOut: number = 0;
  private totalWaitTimeMs: number = 0;
  private totalProcessTimeMs: number = 0;

  constructor() {}

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  public setConcurrencyLimit(limit: number) {
    this.concurrencyLimit = Math.max(1, limit);
  }

  public getConcurrencyLimit(): number {
    return this.concurrencyLimit;
  }

  /**
   * Enqueue a paper retrieval operation.
   * If queue is disabled or under concurrency threshold, executes immediately.
   * Otherwise, queues and resolves in FIFO order.
   */
  public enqueue<T>(
    meta: { studentId: string; studentRegNo: string; paperId: string; priority?: number },
    operation: () => Promise<T>
  ): Promise<T> {
    this.totalReceived++;

    if (!this.isEnabled) {
      // Direct pass-through without queue regulation
      this.totalProcessed++;
      return operation();
    }

    // If active processing is below concurrency limit and queue is empty, run immediately!
    if (this.activeCount < this.concurrencyLimit && this.queue.length === 0) {
      return this.dispatchImmediate(meta, operation);
    }

    // Queue the request
    return new Promise<T>((resolve, reject) => {
      const requestId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const req: QueuedRequest<T> = {
        id: requestId,
        studentId: meta.studentId,
        studentRegNo: meta.studentRegNo,
        paperId: meta.paperId,
        createdAt: performance.now(),
        priority: meta.priority ?? 10,
        execute: operation,
        resolve,
        reject,
        status: 'WAITING'
      };

      // Set timeout safeguard so student is never stranded
      const timer = setTimeout(() => {
        const idx = this.queue.findIndex(item => item.id === req.id);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
          this.totalTimedOut++;
          req.status = 'TIMEOUT';
          db.logQueueEvent({
            request_id: req.id,
            timestamp: new Date().toISOString(),
            queue_wait_ms: Math.round(performance.now() - req.createdAt),
            process_time_ms: 0,
            status: 'TIMEOUT'
          });
          // Reject gracefully
          reject(new Error('High traffic queue timeout. Please retry in a moment.'));
        }
      }, this.queueTimeoutMs);

      // Wrap resolve/reject to clear timer
      const originalResolve = resolve;
      const originalReject = reject;

      req.resolve = (val: T | PromiseLike<T>) => {
        clearTimeout(timer);
        originalResolve(val);
      };

      req.reject = (err: any) => {
        clearTimeout(timer);
        originalReject(err);
      };

      this.queue.push(req);
      // Sort by priority if needed
      this.queue.sort((a, b) => a.priority - b.priority);
    });
  }

  private async dispatchImmediate<T>(
    meta: { studentId: string; studentRegNo: string; paperId: string },
    operation: () => Promise<T>
  ): Promise<T> {
    this.activeCount++;
    const startProc = performance.now();
    try {
      const res = await operation();
      const procTime = performance.now() - startProc;
      this.totalProcessTimeMs += procTime;
      this.totalProcessed++;
      return res;
    } finally {
      this.activeCount--;
      this.processNext();
    }
  }

  private processNext(): void {
    if (!this.isEnabled) return;

    // Parallel multi-worker drain up to available concurrency capacity
    while (this.activeCount < this.concurrencyLimit && this.queue.length > 0) {
      const nextReq = this.queue.shift();
      if (!nextReq) break;

      this.activeCount++;
      nextReq.status = 'PROCESSING';
      const queueWaitMs = performance.now() - nextReq.createdAt;
      this.totalWaitTimeMs += queueWaitMs;

      (async () => {
        const startProc = performance.now();
        try {
          const result = await nextReq.execute();
          const procTime = performance.now() - startProc;
          this.totalProcessTimeMs += procTime;
          this.totalProcessed++;

          db.logQueueEvent({
            request_id: nextReq.id,
            timestamp: new Date().toISOString(),
            queue_wait_ms: Math.round(queueWaitMs),
            process_time_ms: Math.round(procTime),
            status: 'COMPLETED'
          });

          nextReq.resolve(result);
        } catch (err) {
          nextReq.reject(err);
        } finally {
          this.activeCount--;
          this.processNext();
        }
      })();
    }
  }

  public getQueuePosition(studentId: string, paperId: string): { position: number; totalWaiting: number } {
    const idx = this.queue.findIndex(
      q => q.studentId === studentId && q.paperId === paperId
    );
    return {
      position: idx === -1 ? 0 : idx + 1,
      totalWaiting: this.queue.length
    };
  }

  public getMetrics(): QueueStatusMetrics {
    const avgWaitTimeMs = this.totalProcessed > 0 ? this.totalWaitTimeMs / this.totalProcessed : 0;
    const avgProcessTimeMs = this.totalProcessed > 0 ? this.totalProcessTimeMs / this.totalProcessed : 0;
    
    // Estimate wait time in seconds based on queue length and processing speed
    const estimatedWaitTimeSec = this.activeCount > 0 && avgProcessTimeMs > 0
      ? Math.max(0.1, Number(((this.queue.length * (avgProcessTimeMs / 1000)) / this.concurrencyLimit).toFixed(1)))
      : 0;

    return {
      enabled: this.isEnabled,
      concurrencyLimit: this.concurrencyLimit,
      activeProcessingCount: this.activeCount,
      currentQueueLength: this.queue.length,
      totalReceived: this.totalReceived,
      totalProcessed: this.totalProcessed,
      totalTimedOut: this.totalTimedOut,
      avgWaitTimeMs: Number(avgWaitTimeMs.toFixed(1)),
      avgProcessTimeMs: Number(avgProcessTimeMs.toFixed(1)),
      estimatedWaitTimeSec
    };
  }

  public clear(): void {
    // Reject any waiting with cancelled message
    while (this.queue.length > 0) {
      const req = this.queue.shift();
      if (req) {
        req.reject(new Error('Queue reset by administrator'));
      }
    }
    this.totalReceived = 0;
    this.totalProcessed = 0;
    this.totalTimedOut = 0;
    this.totalWaitTimeMs = 0;
    this.totalProcessTimeMs = 0;
  }
}

export const requestQueue = new RequestQueueService();
