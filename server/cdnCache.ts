import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { db, STORAGE_DIR } from './db.js';

export interface CachedPaperItem {
  paperId: string;
  buffer: Buffer;
  mimeType: string;
  etag: string;
  size: number;
  fileName: string;
  cachedAt: number;
  lastAccessedAt: number;
  hits: number;
}

export interface CacheStatistics {
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

class CdnCacheService {
  // In-memory LRU CDN Edge Cache layer
  private cache: Map<string, CachedPaperItem> = new Map();
  private maxCacheSizeBytes: number = 1024 * 1024 * 1024; // 1 GB high-concurrency buffer
  private currentSizeBytes: number = 0;
  
  // Single-flight coalescing map to collapse concurrent origin disk reads
  private inFlightLoads: Map<string, Promise<Buffer>> = new Map();
  
  // Metrics
  private totalHits: number = 0;
  private totalMisses: number = 0;
  private cacheLatencySumMs: number = 0;
  private originLatencySumMs: number = 0;
  private bandwidthSavedBytes: number = 0;
  private isEnabled: boolean = true;

  constructor() {}

  public setEnabled(val: boolean) {
    this.isEnabled = val;
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  public has(paperId: string): boolean {
    return this.isEnabled && this.cache.has(paperId);
  }

  public getFast(paperId: string): CachedPaperItem | undefined {
    if (!this.isEnabled) return undefined;
    const item = this.cache.get(paperId);
    if (item) {
      item.hits++;
      item.lastAccessedAt = Date.now();
      this.totalHits++;
      this.bandwidthSavedBytes += item.size;
    }
    return item;
  }

  public generateEtag(buffer: Buffer): string {
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    return `"${hash}"`;
  }

  /**
   * Retrieves a paper file either from the CDN Edge Cache (Hit)
   * or loads from Origin Disk Storage and warms cache (Miss).
   * Includes single-flight coalescing to prevent cache stampedes under 20,000-student load.
   */
  public async getPaper(
    paperId: string, 
    filePath: string, 
    fileName: string, 
    mimeType: string = 'application/pdf',
    bypassCache: boolean = false
  ): Promise<{
    buffer: Buffer;
    etag: string;
    size: number;
    cacheStatus: 'HIT' | 'MISS' | 'BYPASS';
    latencyMs: number;
  }> {
    const startTime = performance.now();

    if (!this.isEnabled || bypassCache) {
      // Direct Origin Disk Read
      const originStart = performance.now();
      const buffer = await fs.promises.readFile(filePath);
      const originLatency = performance.now() - originStart;
      this.originLatencySumMs += originLatency;
      this.totalMisses++;

      const etag = this.generateEtag(buffer);
      const totalTime = performance.now() - startTime;
      return {
        buffer,
        etag,
        size: buffer.length,
        cacheStatus: 'BYPASS',
        latencyMs: Math.max(1, Math.round(totalTime))
      };
    }

    // Check Edge Cache
    const existing = this.cache.get(paperId);
    if (existing) {
      existing.hits++;
      existing.lastAccessedAt = Date.now();
      // Move to MRU position
      this.cache.delete(paperId);
      this.cache.set(paperId, existing);

      this.totalHits++;
      this.bandwidthSavedBytes += existing.size;
      const latency = Math.max(0.2, performance.now() - startTime);
      this.cacheLatencySumMs += latency;

      return {
        buffer: existing.buffer,
        etag: existing.etag,
        size: existing.size,
        cacheStatus: 'HIT',
        latencyMs: Math.max(1, Math.round(latency))
      };
    }

    // Cache Miss -> Single-Flight Coalesced Origin Load
    this.totalMisses++;
    const diskStart = performance.now();

    let loadPromise = this.inFlightLoads.get(paperId);
    if (!loadPromise) {
      loadPromise = (async () => {
        let targetPath = filePath;
        if (!fs.existsSync(targetPath)) {
          const baseName = path.basename(filePath);
          const storageFallback = path.join(STORAGE_DIR, baseName);
          const cwdFallback = path.resolve(process.cwd(), 'storage', 'papers', baseName);
          if (fs.existsSync(storageFallback)) {
            targetPath = storageFallback;
          } else if (fs.existsSync(cwdFallback)) {
            targetPath = cwdFallback;
          }
        }
        return await fs.promises.readFile(targetPath);
      })();
      this.inFlightLoads.set(paperId, loadPromise);
    }

    let buffer: Buffer;
    try {
      buffer = await loadPromise;
    } finally {
      this.inFlightLoads.delete(paperId);
    }

    const diskLatency = performance.now() - diskStart;
    this.originLatencySumMs += diskLatency;

    const etag = this.generateEtag(buffer);
    const size = buffer.length;

    // Cache paper item if within cache size limits
    this.evictIfNeeded(size);
    if (size <= this.maxCacheSizeBytes) {
      const item: CachedPaperItem = {
        paperId,
        buffer,
        mimeType,
        etag,
        size,
        fileName,
        cachedAt: Date.now(),
        lastAccessedAt: Date.now(),
        hits: 1
      };
      this.cache.set(paperId, item);
      this.currentSizeBytes += size;
    }

    const totalLatency = performance.now() - startTime;
    return {
      buffer,
      etag,
      size,
      cacheStatus: 'MISS',
      latencyMs: Math.max(1, Math.round(totalLatency))
    };
  }

  private evictIfNeeded(incomingSize: number) {
    while (this.currentSizeBytes + incomingSize > this.maxCacheSizeBytes && this.cache.size > 0) {
      // LRU item is first entry in Map
      const firstKey = this.cache.keys().next().value;
      if (!firstKey) break;
      const item = this.cache.get(firstKey);
      if (item) {
        this.currentSizeBytes -= item.size;
        this.cache.delete(firstKey);
      }
    }
  }

  /**
   * Pre-warm / pre-fetch an exam paper into CDN cache before examination release
   */
  public async prewarmPaper(paperId: string, filePath: string, fileName: string): Promise<boolean> {
    try {
      let targetPath = filePath;
      if (!fs.existsSync(targetPath)) {
        const baseName = path.basename(filePath);
        const storageFallback = path.join(STORAGE_DIR, baseName);
        const cwdFallback = path.resolve(process.cwd(), 'storage', 'papers', baseName);
        if (fs.existsSync(storageFallback)) {
          targetPath = storageFallback;
        } else if (fs.existsSync(cwdFallback)) {
          targetPath = cwdFallback;
        }
      }
      if (!fs.existsSync(targetPath)) return false;
      const buffer = await fs.promises.readFile(targetPath);
      const etag = this.generateEtag(buffer);
      const size = buffer.length;

      this.evictIfNeeded(size);
      this.cache.set(paperId, {
        paperId,
        buffer,
        mimeType: 'application/pdf',
        etag,
        size,
        fileName,
        cachedAt: Date.now(),
        lastAccessedAt: Date.now(),
        hits: 0
      });
      this.currentSizeBytes += size;
      return true;
    } catch (err) {
      console.error('Pre-warm paper failed:', err);
      return false;
    }
  }

  public invalidatePaper(paperId: string): boolean {
    const existing = this.cache.get(paperId);
    if (existing) {
      this.currentSizeBytes -= existing.size;
      this.cache.delete(paperId);
      return true;
    }
    return false;
  }

  public clear(): void {
    this.cache.clear();
    this.currentSizeBytes = 0;
    this.totalHits = 0;
    this.totalMisses = 0;
    this.cacheLatencySumMs = 0;
    this.originLatencySumMs = 0;
    this.bandwidthSavedBytes = 0;
  }

  public getStats(): CacheStatistics {
    const totalRequests = this.totalHits + this.totalMisses;
    const hitRatePercent = totalRequests > 0 ? (this.totalHits / totalRequests) * 100 : 0;
    const avgCacheLatencyMs = this.totalHits > 0 ? this.cacheLatencySumMs / this.totalHits : 0;
    const avgOriginLatencyMs = this.totalMisses > 0 ? this.originLatencySumMs / this.totalMisses : 0;

    const frequentlyAccessed = Array.from(this.cache.values())
      .map(item => {
        const paper = db.findPaperById(item.paperId);
        return {
          paperId: item.paperId,
          title: paper ? paper.title : item.fileName,
          hits: item.hits,
          size: item.size,
          lastAccessed: new Date(item.lastAccessedAt).toLocaleTimeString()
        };
      })
      .sort((a, b) => b.hits - a.hits);

    return {
      enabled: this.isEnabled,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      totalRequests,
      hitRatePercent: Number(hitRatePercent.toFixed(1)),
      cachedPaperCount: this.cache.size,
      cachedTotalSizeBytes: this.currentSizeBytes,
      avgCacheLatencyMs: Number(avgCacheLatencyMs.toFixed(1)),
      avgOriginLatencyMs: Number(avgOriginLatencyMs.toFixed(1)),
      bandwidthSavedBytes: this.bandwidthSavedBytes,
      frequentlyAccessed
    };
  }
}

export const cdnCache = new CdnCacheService();
