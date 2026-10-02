import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  HardDrive,
  Layers,
  Pause,
  Play,
  RefreshCw,
  Server,
  Shield,
  Trash2,
  Zap
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Api } from '../api.js';
import { MonitoringData } from '../types.js';

export const LiveMonitoring: React.FC = () => {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    try {
      const res = await Api.getRealtimeMetrics();
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to poll telemetry metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    if (!autoRefresh) return;
    const interval = setInterval(fetchMetrics, 2500);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleToggleCdn = async () => {
    if (!data) return;
    try {
      await Api.toggleCdn(!data.cache.enabled);
      fetchMetrics();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleQueue = async () => {
    if (!data) return;
    try {
      await Api.toggleQueue(!data.queue.enabled);
      fetchMetrics();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleClearLogs = async () => {
    try {
      await Api.clearLogs();
      fetchMetrics();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const cache = data?.cache;
  const queue = data?.queue;
  const traffic = data?.traffic;

  return (
    <div className="space-y-6">
      {/* Top Controller Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Activity className="h-5 w-5 text-cyan-400" />
            <span>Edge CDN & Traffic Pipeline Telemetry</span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time cache hit ratio, origin offload, and queue metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Toggle CDN */}
          <button
            onClick={handleToggleCdn}
            className={`px-3 py-1.5 rounded-lg border font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
              cache?.enabled
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300 hover:bg-emerald-900'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>CDN Cache: {cache?.enabled ? 'Active' : 'Bypassed'}</span>
          </button>

          {/* Toggle Queue */}
          <button
            onClick={handleToggleQueue}
            className={`px-3 py-1.5 rounded-lg border font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
              queue?.enabled
                ? 'bg-blue-950/80 border-blue-800 text-blue-300 hover:bg-blue-900'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Queue: {queue?.enabled ? 'Active' : 'Disabled'}</span>
          </button>

          {/* Pause / Resume */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 transition"
            title={autoRefresh ? 'Pause live stream' : 'Resume live stream'}
          >
            {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>

          {/* Clear Logs */}
          <button
            onClick={handleClearLogs}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-300 border border-slate-700 text-slate-400 transition"
            title="Clear logs and metrics"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cache Hit Rate */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Cache Hit Rate</span>
            <Zap className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {cache?.hitRatePercent ?? 0}%
          </div>
          <div className="text-[11px] text-slate-500 flex items-center space-x-1">
            <span className="text-emerald-400">{cache?.totalHits ?? 0} hits</span>
            <span>•</span>
            <span className="text-amber-400">{cache?.totalMisses ?? 0} misses</span>
          </div>
        </div>

        {/* Avg Edge Latency */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Edge Delivery Latency</span>
            <Clock className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {cache?.avgCacheLatencyMs ? `${cache.avgCacheLatencyMs} ms` : '< 2 ms'}
          </div>
          <div className="text-[11px] text-slate-500">
            vs Origin Disk ({cache?.avgOriginLatencyMs ? `${cache.avgOriginLatencyMs} ms` : '~25 ms'})
          </div>
        </div>

        {/* Origin Bandwidth Saved */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Bandwidth Offloaded</span>
            <HardDrive className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {cache?.bandwidthSavedBytes ? `${(cache.bandwidthSavedBytes / (1024 * 1024)).toFixed(1)} MB` : '0 MB'}
          </div>
          <div className="text-[11px] text-slate-500">
            Directly absorbed by CDN edge
          </div>
        </div>

        {/* Queue Buffer */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Request Queue Depth</span>
            <Layers className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {queue?.currentQueueLength ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">
            Processed: {queue?.totalProcessed ?? 0} requests
          </div>
        </div>
      </div>

      {/* Visual Pipeline Representation */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Digital Examination Distribution Pipeline
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {/* Step 1: Students */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold text-white">1. Student Requests</span>
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping"></span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Concurrent authenticated downloads by registration number.
            </p>
            <div className="font-mono text-cyan-400 font-bold">
              Total Inbound: {traffic?.totalRequests ?? 0}
            </div>
          </div>

          {/* Step 2: Queue / Rate Buffer */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold text-white">2. Adaptive Queue</span>
              <Layers className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-slate-500 text-[11px]">
              Throttles flash traffic spikes to prevent thread pool collapse.
            </p>
            <div className="font-mono text-blue-300 font-bold">
              Queue State: {queue?.enabled ? `${queue.currentQueueLength} waiting` : 'Bypassed'}
            </div>
          </div>

          {/* Step 3: CDN Cache */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold text-white">3. Edge CDN Cache</span>
              <Zap className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-slate-500 text-[11px]">
              Serves repeated PDF requests from high-speed memory (~1ms).
            </p>
            <div className="font-mono text-emerald-400 font-bold">
              Hit Ratio: {cache?.hitRatePercent ?? 0}% ({cache?.cachedPaperCount ?? 0} cached)
            </div>
          </div>

          {/* Step 4: Origin Disk */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold text-white">4. Secure Storage</span>
              <Database className="h-4 w-4 text-purple-400" />
            </div>
            <p className="text-slate-500 text-[11px]">
              Protected origin storage. Only accessed on initial cache miss.
            </p>
            <div className="font-mono text-purple-300 font-bold">
              Origin Reads: {cache?.totalMisses ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Access Logs Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden space-y-3">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <span>Recent Access Logs</span>
            <span className="text-[10px] font-mono text-slate-400 font-normal">
              (Live student paper requests)
            </span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {data?.recentLogs.length ?? 0} recorded
          </span>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-2.5">Timestamp</th>
                <th className="px-4 py-2.5">Student Reg No</th>
                <th className="px-4 py-2.5">Paper / Subject</th>
                <th className="px-4 py-2.5">Cache Status</th>
                <th className="px-4 py-2.5">Response Time</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {!data?.recentLogs || data.recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No access events logged yet. Open an exam paper as a student or run a traffic simulation.
                  </td>
                </tr>
              ) : (
                data.recentLogs.map((log) => {
                  const isHit = log.cache_status === 'HIT';
                  const isSuccess = log.status === 'SUCCESS';
                  return (
                    <tr key={log.id} className="hover:bg-slate-850/50 transition">
                      <td className="px-4 py-2 text-slate-400 text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-2 text-cyan-300 font-bold">
                        {log.student_reg_no}
                      </td>
                      <td className="px-4 py-2 text-slate-300 font-sans truncate max-w-xs">
                        {log.paper_title}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isHit
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                            : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                        }`}>
                          {log.cache_status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-300 text-[11px]">
                        {log.response_time_ms} ms
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isSuccess
                            ? 'bg-blue-950 text-blue-300'
                            : 'bg-rose-950 text-rose-300'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
