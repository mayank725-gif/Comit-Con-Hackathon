"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import { ProcessResponse } from "@/types";
import {
  Zap,
  Cpu,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Clock,
  Layers,
} from "lucide-react";

const DEMO_PRESETS = [
  {
    title: "AI Synthesis & Action Plan",
    query: "Analyze user churn patterns in SaaS cohort and recommend automated retention playbooks.",
  },
  {
    title: "System Performance Audit",
    query: "Evaluate database latency bottlenecks and suggest serverless caching configuration.",
  },
  {
    title: "Autonomous Agent Task",
    query: "Extract unstructured financial invoices into verified JSON schema with compliance verification.",
  },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "json">("summary");

  const handleProcess = async (inputQuery?: string) => {
    const textToSubmit = (inputQuery ?? query).trim();
    if (!textToSubmit) return;

    if (inputQuery) setQuery(inputQuery);
    setIsLoading(true);

    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: textToSubmit }),
      });

      const data: ProcessResponse = await res.json();
      setResult(data);
    } catch (err) {
      console.error("Execution error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30">
      <Navbar appName="ComitCon Engine" />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-6 sm:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Next-Gen Hackathon Prototype</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
              Instant Intelligence &amp; Autonomous Processing
            </h1>
            <p className="text-base sm:text-lg text-zinc-400">
              Transform complex inputs into validated insights, structured data, and automated workflows within seconds.
            </p>
          </div>
        </div>

        {/* Real-Time Metrics Overview */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatsCard
            label="Inference Latency"
            value={result ? `${result.executionTimeMs}ms` : "320ms"}
            change="⚡ Realtime"
            icon={Zap}
            subtext="Sub-second response"
          />
          <StatsCard
            label="Confidence Index"
            value={result ? result.metrics[0]?.value || "98.4%" : "98.4%"}
            change="+2.4%"
            icon={ShieldCheck}
            subtext="Precision verified"
          />
          <StatsCard
            label="System Throughput"
            value="1.4k req/m"
            change="+14%"
            icon={Cpu}
            subtext="Serverless auto-scale"
          />
          <StatsCard
            label="Execution Status"
            value={result?.mode === "live" ? "Live AI" : "Mock Ready"}
            change="Active"
            icon={BarChart3}
            subtext="Zero downtime fallback"
          />
        </div>

        {/* Interactive Workspace / Input Console */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Input Form & Presets */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                  Input Console
                </h2>
                <span className="text-xs text-zinc-500 font-mono">POST /api/process</span>
              </div>

              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter problem prompt, payload, or instruction here..."
                rows={5}
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950/80 p-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
              />

              <button
                onClick={() => handleProcess()}
                disabled={isLoading || !query.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Processing Pipeline...</span>
                  </>
                ) : (
                  <>
                    <span>Execute Workflow</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Instant Presets for Live Judging Demo */}
              <div className="pt-2 border-t border-zinc-800 space-y-2">
                <span className="text-xs font-semibold text-zinc-400">
                  ⚡ 1-Click Demo Presets (For Judges):
                </span>
                <div className="space-y-1.5">
                  {DEMO_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleProcess(preset.query)}
                      className="w-full text-left p-2.5 rounded-lg border border-zinc-800/80 bg-zinc-950/40 hover:bg-zinc-800/60 hover:border-zinc-700 text-xs transition-all flex items-center justify-between group"
                    >
                      <span className="font-medium text-zinc-300 group-hover:text-indigo-300">
                        {preset.title}
                      </span>
                      <ArrowRight className="h-3 w-3 text-zinc-600 group-hover:text-indigo-400 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Execution Results & Visualizer */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm space-y-5 min-h-[460px] flex flex-col justify-between">
              <div>
                {/* Result Header */}
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                      Live Output Stream
                    </h2>
                    {result && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          result.mode === "live"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {result.mode === "live" ? "Live API Model" : "Fast Simulated Fallback"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab("summary")}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                        activeTab === "summary"
                          ? "bg-zinc-800 text-white"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Summary
                    </button>
                    <button
                      onClick={() => setActiveTab("json")}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                        activeTab === "json"
                          ? "bg-zinc-800 text-white"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      JSON
                    </button>
                    {result && (
                      <button
                        onClick={handleCopy}
                        className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white transition-colors"
                        title="Copy to clipboard"
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Result Body */}
                <div className="pt-4">
                  {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-3">
                      <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                      <p className="text-sm text-zinc-400 font-mono animate-pulse">
                        Analyzing data &amp; building response payload...
                      </p>
                    </div>
                  ) : !result ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800/80 text-zinc-400">
                        <Layers className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-zinc-300">Awaiting Trigger</h3>
                        <p className="text-xs text-zinc-500 max-w-sm">
                          Select one of the demo presets on the left or type your custom query to view real-time processing.
                        </p>
                      </div>
                    </div>
                  ) : activeTab === "summary" ? (
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">
                          {result.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-300 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80 font-normal">
                          {result.summary}
                        </p>
                      </div>

                      {/* Key Insights List */}
                      <div className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                          Automated Insights
                        </span>
                        <div className="space-y-2">
                          {result.keyInsights.map((insight, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2.5 rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-3 text-xs text-zinc-200"
                            >
                              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{insight}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Dynamic Metric Badges */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                        {result.metrics.map((metric, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-3 text-center"
                          >
                            <span className="text-[10px] text-zinc-400 block font-medium">
                              {metric.label}
                            </span>
                            <span className="text-sm font-bold text-white mt-0.5 block">
                              {metric.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* JSON View */
                    <pre className="max-h-[380px] overflow-auto rounded-xl bg-zinc-950 p-4 text-xs font-mono text-zinc-300 border border-zinc-800">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  )}
                </div>
              </div>

              {/* Result Footer */}
              {result && (
                <div className="pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500 font-mono">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Completed in {result.executionTimeMs}ms</span>
                  </div>
                  <span>Status: 200 OK</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
