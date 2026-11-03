"use client";

import React, { useState, useRef, useEffect } from "react";
import { AssistantMessage } from "@/lib/uber/types";
import {
  Send,
  Sparkles,
  Navigation,
  DollarSign,
  AlertTriangle,
  Info,
} from "lucide-react";

interface DriverAssistantChatProps {
  messages: AssistantMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
}

const PRESET_QUERIES = [
  {
    label: "📍 Best Repositioning Zone",
    query: "Where should I go to get high-fare rides right now?",
  },
  {
    label: "🏟️ Explain Stadium Surge",
    query: "Why is the surge so high at the Central Stadium?",
  },
  {
    label: "💰 Shift Earnings & Pace",
    query: "How are my earnings today and what is my hourly pace?",
  },
  {
    label: "🛡️ Michelangelo Model Health",
    query: "Is the Michelangelo predictive model experiencing drift?",
  },
];

export default function DriverAssistantChat({
  messages,
  onSendMessage,
  isLoading,
}: DriverAssistantChatProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages change or loading state toggles
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const queryToSend = inputText.trim();
    if (!queryToSend || isLoading) return;
    setInputText("");
    await onSendMessage(queryToSend);
  };

  const handlePresetClick = async (query: string) => {
    if (isLoading) return;
    await onSendMessage(query);
  };

  return (
    <div className="flex flex-col h-[540px] rounded-3xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-md overflow-hidden shadow-2xl">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 shadow-md shadow-indigo-500/25">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-tight">
              Uber Assistant Copilot
            </h3>
            <p className="text-[10px] text-zinc-400">Multi-Agent Dispatch &amp; Intelligence</p>
          </div>
        </div>
        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
          Agent Online
        </span>
      </div>

      {/* Preset Action Buttons (2x2 Grid - No Horizontal Overflow Scrollbar) */}
      <div className="border-b border-zinc-800/80 bg-zinc-950/60 p-2.5 grid grid-cols-2 gap-1.5">
        {PRESET_QUERIES.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handlePresetClick(preset.query)}
            disabled={isLoading}
            className="text-left rounded-xl border border-zinc-800 bg-zinc-900/90 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 hover:border-indigo-500 hover:text-white transition-all disabled:opacity-50 truncate shadow-sm"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Messages Stream with Smooth Auto-Scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.map((msg) => {
          const isDriver = msg.sender === "DRIVER";

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isDriver ? "items-end" : "items-start"} space-y-1`}
            >
              {!isDriver && msg.agentType && (
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-400 px-1">
                  AGENT: {msg.agentType}
                </span>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  isDriver
                    ? "bg-indigo-600 text-white rounded-br-none shadow-md"
                    : "border border-zinc-800 bg-zinc-950 text-zinc-200 rounded-bl-none shadow-md"
                }`}
              >
                <div className="space-y-2">
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* Recommendation Card */}
                  {msg.actionableRecommendation && (
                    <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-2.5 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-indigo-300">
                        <span>Recommended Target:</span>
                        <span>{msg.actionableRecommendation.suggestedZone}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                        <span>Expected Surge:</span>
                        <span className="text-emerald-400 font-bold">
                          {msg.actionableRecommendation.estimatedSurge}x
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                        <span>Estimated Premium:</span>
                        <span className="text-white font-bold">
                          {msg.actionableRecommendation.extraEarningsEstimate}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <span className="text-[9px] text-zinc-500 font-mono px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300 max-w-[70%]">
            <div className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
            <span className="font-mono text-[11px]">Michelangelo agent routing query...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form with Immediate Enter-to-Submit */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-zinc-800 bg-zinc-950/95 p-3 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask driver copilot (e.g. 'Where is the highest surge?')..."
          className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-indigo-600/25 shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
