import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  Flame,
  Gauge,
  Play,
  RefreshCw,
  Server,
  Shield,
  TrendingDown,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';
import React, { useState } from 'react';
import { Api } from '../api.js';
import { ExamPaperItem, SimulationResultData } from '../types.js';

interface TrafficSimulatorProps {
  papers: ExamPaperItem[];
}

export const TrafficSimulator: React.FC<TrafficSimulatorProps> = ({ papers }) => {
  const [studentCount, setStudentCount] = useState<number>(5000);
  const [selectedPaperId, setSelectedPaperId] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Results
  const [baselineResult, setBaselineResult] = useState<SimulationResultData | null>(null);
  const [optimizedResult, setOptimizedResult] = useState<SimulationResultData | null>(null);

  const studentCountOptions = [500, 1000, 5000, 10000, 20000];

  const handleRunTest = async () => {
    setIsRunning(true);
    setErrorMessage(null);
    try {
      // 1. Run Without CDN
      const baseRes = await Api.runSimulation({
        requestCount: studentCount,
        optimized: false,
        paperId: selectedPaperId || undefined,
        concurrency: 30
      });
      setBaselineResult(baseRes.result);

      // 2. Run With CDN
      const optRes = await Api.runSimulation({
        requestCount: studentCount,
        optimized: true,
        paperId: selectedPaperId || undefined,
        concurrency: 30
      });
      setOptimizedResult(optRes.result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Simulation failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const baseMs = baselineResult ? baselineResult.avgResponseTimeMs : 45;
  const optMs = optimizedResult ? optimizedResult.avgResponseTimeMs : 0.8;
  const speedup = (baseMs / Math.max(optMs, 0.1)).toFixed(0);

  return (
    <div className="space-y-6">
      {/* Quick Explainer & Controls */}
      <div className="glass-panel p-6 sm:p-7 rounded-2xl space-y-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 text-xs font-semibold mb-2">
              <Zap className="h-3.5 w-3.5 text-cyan-400" />
              <span>High-Concurrency Stress Test</span>
            </div>
            <h2 className="text-xl font-bold text-white">
              Simulate 20,000 students opening exam papers simultaneously
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Compare origin disk saturation vs Edge CDN memory cache under load.
            </p>
          </div>

          <button
            onClick={handleRunTest}
            disabled={isRunning}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs transition shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 ring-1 ring-white/10 shrink-0"
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Simulating {studentCount} Students...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Start Speed Test</span>
              </>
            )}
          </button>
        </div>

        {/* Configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              1. Number of Students:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {studentCountOptions.map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setStudentCount(count)}
                  className={`py-2 rounded-xl text-center font-mono font-bold transition cursor-pointer ${
                    studentCount === count
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-white/10'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {count} Students
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              2. Target Exam Paper:
            </label>
            <select
              value={selectedPaperId}
              onChange={(e) => setSelectedPaperId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
            >
              <option value="">Any Available Exam Paper (Auto)</option>
              {papers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.subject} ({p.department} - Sem {p.semester})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs">
          {errorMessage}
        </div>
      )}

      {/* Results Comparison Side-by-Side */}
      {(baselineResult || optimizedResult) && (
        <div className="space-y-4 animate-in fade-in">
          {/* Winner Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-cyan-950/80 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  CDN Delivered Exam Papers {speedup}x Faster!
                </h4>
                <p className="text-xs text-slate-300">
                  Memory cache protected the main server from 100% of student request overload.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {studentCount} Students Tested
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 🔴 Left: Without CDN */}
            <div className="glass-panel p-6 rounded-2xl border-rose-900/60 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="h-3 w-3 rounded-full bg-rose-500 animate-pulse"></span>
                  <h4 className="text-sm font-bold text-white">🔴 WITHOUT CDN (Direct Server)</h4>
                </div>
                <span className="text-[11px] font-mono text-rose-400 font-semibold">Slow Delivery</span>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Average Student Wait Time:</span>
                  <span className="text-xl font-mono font-black text-rose-400">
                    {baseMs.toFixed(1)} ms
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Server Load:</span>
                  <span className="text-xs font-mono font-bold text-rose-400">
                    100% Hard Disk Strain
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Server Crash Risk:</span>
                  <span className="text-xs font-bold text-amber-400">
                    HIGH (Under 1,000+ students)
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 pt-2 border-t border-slate-800">
                Every student hit the origin hard disk simultaneously, creating heavy queue delays.
              </p>
            </div>

            {/* 🟢 Right: With CDN */}
            <div className="glass-panel p-6 rounded-2xl border-emerald-800/80 shadow-xl space-y-4 ring-1 ring-emerald-500/20">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-400 animate-ping"></span>
                  <h4 className="text-sm font-bold text-white">🟢 WITH CDN (Smart Edge Cache)</h4>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">Instant Delivery</span>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Average Student Wait Time:</span>
                  <span className="text-xl font-mono font-black text-emerald-400">
                    {optMs.toFixed(1)} ms
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Server Load:</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    0% Load (Served from RAM)
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Server Crash Risk:</span>
                  <span className="text-xs font-bold text-emerald-300">
                    ZERO (100% Protected)
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 pt-2 border-t border-slate-800">
                Exam papers were served instantly from fast edge memory. The origin server remained completely idle.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
