"use client";

import React, { useState, useRef, useEffect } from "react";
import { AssistantMessage } from "@/lib/uber/types";
import {
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Cpu,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Check,
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
    query: "Why is the surge so high at M. Chinnaswamy Stadium?",
  },
  {
    label: "🌧️ Monsoon & Flood Safety",
    query: "Are there any waterlogged routes or rain safety advisories in Bengaluru?",
  },
  {
    label: "💰 Shift Earnings & Pace",
    query: "How are my earnings today and what is my hourly pace?",
  },
];

export default function DriverAssistantChat({
  messages,
  onSendMessage,
  isLoading,
}: DriverAssistantChatProps) {
  const [inputText, setInputText] = useState("");
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);
  const [activeSpeechMessageId, setActiveSpeechMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom whenever messages change or loading state toggles
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Voice output (TTS) via Web Speech API
  const speakText = (text: string, msgId: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (window.speechSynthesis.speaking && activeSpeechMessageId === msgId) {
      window.speechSynthesis.cancel();
      setActiveSpeechMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown asterisks and emojis for speech
    const cleanText = text
      .replace(/[*_#`~]/g, "")
      .replace(/[^\w\s₹.,!?-]/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => setActiveSpeechMessageId(null);
    utterance.onerror = () => setActiveSpeechMessageId(null);

    setActiveSpeechMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // If voice enabled, speak the latest assistant response
  useEffect(() => {
    if (isVoiceEnabled && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender === "ASSISTANT" && lastMsg.id !== activeSpeechMessageId) {
        speakText(lastMsg.text, lastMsg.id);
      }
    }
  }, [messages, isVoiceEnabled]);

  // Voice Input (Speech-to-Text) using Web Speech Recognition
  const toggleListening = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN"; // English (India)

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
          setIsListening(false);
          // auto-send the recognized command
          onSendMessage(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Speech recognition error:", e);
      setIsListening(false);
    }
  };

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
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-4 py-3">
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

        {/* Voice Audio Mode Toggle & Status */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (isVoiceEnabled && typeof window !== "undefined" && "speechSynthesis" in window) {
                window.speechSynthesis.cancel();
                setActiveSpeechMessageId(null);
              }
              setIsVoiceEnabled(!isVoiceEnabled);
            }}
            title={isVoiceEnabled ? "Voice Output Active (Click to mute)" : "Enable Hands-Free Voice Output"}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all ${
              isVoiceEnabled
                ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            {isVoiceEnabled ? <Volume2 className="h-3 w-3 text-indigo-400" /> : <VolumeX className="h-3 w-3" />}
            <span>{isVoiceEnabled ? "Voice ON" : "Voice"}</span>
          </button>

          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
            Online
          </span>
        </div>
      </div>

      {/* Preset Action Buttons (2x2 Grid) */}
      <div className="border-b border-zinc-800/80 bg-zinc-950/60 p-2 grid grid-cols-2 gap-1.5">
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
          const isExpanded = expandedTraceId === msg.id;
          const isSpeaking = activeSpeechMessageId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isDriver ? "items-end" : "items-start"} space-y-1`}
            >
              {!isDriver && (
                <div className="flex items-center justify-between w-full max-w-[85%] px-1">
                  {msg.agentType && (
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-400">
                      AGENT: {msg.agentType}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => speakText(msg.text, msg.id)}
                    title="Speak text aloud"
                    className="text-zinc-500 hover:text-white transition-colors"
                  >
                    <Volume2 className={`h-3 w-3 ${isSpeaking ? "text-indigo-400 animate-bounce" : ""}`} />
                  </button>
                </div>
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

                  {/* Explainable AI (XAI) Trace Drawer */}
                  {msg.routingTrace && (
                    <div className="pt-1 border-t border-zinc-800/80">
                      <button
                        type="button"
                        onClick={() => setExpandedTraceId(isExpanded ? null : msg.id)}
                        className="flex items-center justify-between w-full text-[10px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        <span className="flex items-center gap-1 text-indigo-400">
                          <Cpu className="h-3 w-3" />
                          <span>Explainable AI (XAI) Trace</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-emerald-400 font-bold">
                            {Math.round(msg.routingTrace.confidenceScore * 100)}% Conf
                          </span>
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-2.5 rounded-xl border border-zinc-800 bg-black/60 font-mono text-[9px] space-y-1.5 text-zinc-400">
                          <div className="flex justify-between">
                            <span>Inference Latency:</span>
                            <span className="text-white font-bold">{msg.routingTrace.latencyMs}ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tokens Evaluated:</span>
                            <span className="text-white font-bold">{msg.routingTrace.tokensEvaluated}</span>
                          </div>
                          <div>
                            <span className="block text-zinc-500 mb-0.5">Features Queried:</span>
                            <div className="flex flex-wrap gap-1">
                              {msg.routingTrace.featuresQueried.map((feat, i) => (
                                <span key={i} className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                                  {feat}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
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

      {/* Input Bar with Voice Input (Microphone) & Send Button */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-zinc-800 bg-zinc-950/90 p-3 flex items-center gap-2"
      >
        {/* Voice Input Microphone Button */}
        <button
          type="button"
          onClick={toggleListening}
          title={isListening ? "Listening... (Click to stop)" : "Speak to Driver Copilot"}
          className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
            isListening
              ? "border-rose-500 bg-rose-500/20 text-rose-400 animate-pulse"
              : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
          }`}
        >
          {isListening ? <Mic className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isListening ? "Listening to your voice..." : "Ask copilot (e.g., 'Where is highest surge?')..."}
          disabled={isLoading}
          className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />

        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 transition-all shadow-md shadow-indigo-600/25"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}