"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, Activity, FileText, CheckSquare, BarChart3, Sliders } from "lucide-react";

export type NavTab = "studio" | "approvals" | "benchmark" | "audit" | "rules";

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  pendingApprovalsCount: number;
}

export default function Navbar({
  activeTab,
  onTabChange,
  pendingApprovalsCount,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                AgentGuard
              </span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/25">
                Amazon AgentCore Inspired
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Governed AI Agent with Pre-Execution Guardrails &amp; Human Approval
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/80 p-1 text-xs">
          <button
            onClick={() => onTabChange("studio")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === "studio"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Agent Studio</span>
          </button>

          <button
            onClick={() => onTabChange("approvals")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all relative ${
              activeTab === "approvals"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Approvals</span>
            {pendingApprovalsCount > 0 && (
              <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-black animate-pulse">
                {pendingApprovalsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange("benchmark")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === "benchmark"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Benchmark (20pts)</span>
            <span className="md:hidden">Benchmark</span>
          </button>

          <button
            onClick={() => onTabChange("audit")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === "audit"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Audit Log</span>
          </button>

          <button
            onClick={() => onTabChange("rules")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === "rules"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Guardrails</span>
          </button>
        </nav>

        {/* Right Status Indicator */}
        <div className="hidden lg:flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-mono text-[11px] text-emerald-400">Policy Guard: Active</span>
        </div>
      </div>
    </header>
  );
}
