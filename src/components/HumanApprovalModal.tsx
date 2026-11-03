"use client";

import React, { useState } from "react";
import { HumanApprovalItem } from "@/lib/types";
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  Clock,
  User,
  DollarSign,
  AlertTriangle,
  Send,
} from "lucide-react";

interface HumanApprovalModalProps {
  item: HumanApprovalItem;
  onResolve: (id: string, decision: "APPROVED" | "REJECTED", note: string) => Promise<void>;
  onClose: () => void;
}

export default function HumanApprovalModal({
  item,
  onResolve,
  onClose,
}: HumanApprovalModalProps) {
  const [decisionNote, setDecisionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (decision: "APPROVED" | "REJECTED") => {
    setIsSubmitting(true);
    try {
      await onResolve(
        item.id,
        decision,
        decisionNote.trim() || (decision === "APPROVED" ? "Approved by Senior Manager after verification." : "Rejected due to budget/vendor constraints.")
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{item.taskTitle}</h3>
                <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                  REQUIRES SIGN-OFF
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">Ticket ID: {item.id} • Task: {item.taskId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <span className="text-[10px] text-zinc-500 font-medium block">Requested Amount</span>
            <span className="text-base font-bold text-white mt-0.5 block">
              {item.amount ? `$${item.amount.toLocaleString()}` : "N/A"}
            </span>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <span className="text-[10px] text-zinc-500 font-medium block">Target Vendor</span>
            <span className="text-sm font-semibold text-zinc-200 mt-0.5 truncate block">
              {item.vendor || "Internal"}
            </span>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <span className="text-[10px] text-zinc-500 font-medium block">Requester</span>
            <span className="text-xs font-mono text-zinc-300 mt-0.5 truncate block">
              {item.requester}
            </span>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <span className="text-[10px] text-zinc-500 font-medium block">Risk Assessment</span>
            <span className="text-xs font-bold text-amber-400 mt-0.5 block">
              {item.riskLevel} RISK
            </span>
          </div>
        </div>

        {/* Trigger Reason Box */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <AlertTriangle className="h-4 w-4" />
            <span>Policy Guardrail Interception:</span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed font-mono">
            {item.triggerReason}
          </p>
        </div>

        {/* Manager Decision Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300">
            Manager Reviewer Note (Stored in immutable audit trail):
          </label>
          <textarea
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            placeholder="e.g., Verified invoice against Q4 PO #9482. Budget approved for production lease."
            rows={2}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-xs text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800">
          <button
            onClick={() => handleSubmit("REJECTED")}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-all disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            <span>Reject &amp; Abort Task</span>
          </button>
          <button
            onClick={() => handleSubmit("APPROVED")}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Authorize &amp; Resume Agent</span>
          </button>
        </div>
      </div>
    </div>
  );
}
