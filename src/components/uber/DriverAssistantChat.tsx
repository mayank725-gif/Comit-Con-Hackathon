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

const PRESET_QUERIES_HI = [
  {
    label: "🎯 मेरा कार्यक्षेत्र व आज का लक्ष्य",
    query: "मेरे कार्यक्षेत्र और आज के लक्ष्य की क्या स्थिति है?",
  },
  {
    label: "📍 सबसे ज्यादा कमाई वाला इलाका",
    query: "अभी सबसे ज्यादा कमाई वाली राइड कहाँ मिलेगी?",
  },
  {
    label: "🏛️ प्रमुख पर्यटन स्थल किराया",
    query: "ताज महल, गोवा और मैसूर के लिए उबर आउटस्टेशन का किराया कितना है?",
  },
  {
    label: "🏟️ स्टेडियम में भारी सर्ज क्यों?",
    query: "चिन्नास्वामी स्टेडियम में इतना अधिक सर्ज क्यों है?",
  },
  {
    label: "💰 आज की शिफ्ट कमाई व दर",
    query: "मेरी आज की कुल कमाई और प्रति घंटे की रफ्तार क्या है?",
  },
];

const PRESET_QUERIES_EN = [
  {
    label: "🎯 My Work Area & Target",
    query: "What is my assigned work area status and shift target?",
  },
  {
    label: "📍 Best Repositioning Zone",
    query: "Where should I go to get high-fare rides right now?",
  },
  {
    label: "🏛️ Tourist Outstation Fares",
    query: "What are the Uber Outstation fares for major tourist destinations like Taj Mahal, Goa, or Mysore?",
  },
  {
    label: "🏟️ Explain Stadium Surge",
    query: "Why is the surge so high at M. Chinnaswamy Stadium?",
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
  const [chatLang, setChatLang] = useState<"hi" | "en">("hi");
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);
  const [activeSpeechMessageId, setActiveSpeechMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Pre-load speech voices
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const getV = () => window.speechSynthesis.getVoices();
      getV();
      window.speechSynthesis.onvoiceschanged = getV;
    }
  }, []);

  // Auto-scroll to bottom whenever messages change or loading state toggles
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Voice output (TTS) via Web Speech API in Hindi or English
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
      .replace(/[^\w\s\u0900-\u097F₹.,!?-]/g, "");

    const isTextHindi = /[\u0900-\u097F]/.test(cleanText) || chatLang === "hi";
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = isTextHindi ? "hi-IN" : "en-IN";
    utterance.rate = isTextHindi ? 0.95 : 1.05;
    utterance.pitch = 1.0;

    if (isTextHindi) {
      const voices = window.speechSynthesis.getVoices();
      const hindiVoice = voices.find(
        (v) =>
          v.lang === "hi-IN" ||
          v.lang.startsWith("hi") ||
          v.name.includes("Hindi") ||
          v.name.includes("हिन्दी") ||
          v.name.includes("Hemant") ||
          v.name.includes("Kalpana") ||
          v.name.includes("Lekha")
      );
      if (hindiVoice) {
        utterance.voice = hindiVoice;
      }
    }

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

  // Voice Input (Speech-to-Text) using Web Speech Recognition in Hindi or English
  const toggleListening = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        chatLang === "hi"
          ? "इस ब्राउज़र में स्पीच रिकॉग्निशन समर्थित नहीं है। कृपया Chrome, Edge, या Safari का उपयोग करें।"
          : "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari."
      );
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
      recognition.lang = chatLang === "hi" ? "hi-IN" : "en-IN";

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

  const currentPresets = chatLang === "hi" ? PRESET_QUERIES_HI : PRESET_QUERIES_EN;

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
              {chatLang === "hi" ? "उबर ड्राइवर कॉपायलट" : "Uber Assistant Copilot"}
            </h3>
            <p className="text-[10px] text-zinc-400">
              {chatLang === "hi" ? "माइकल एंजेलो एआई डिस्पैच" : "Multi-Agent Dispatch & Intelligence"}
            </p>
          </div>
        </div>

        {/* Voice Audio Mode Toggle, Language Selector & Status */}
        <div className="flex items-center gap-1.5">
          {/* Hindi / English Chat Language Toggle */}
          <div className="flex items-center bg-zinc-900 rounded-xl p-0.5 border border-zinc-800 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setChatLang("hi")}
              className={`px-2 py-0.5 rounded-lg transition-all ${
                chatLang === "hi"
                  ? "bg-amber-500 text-black shadow-sm font-extrabold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              🇮🇳 हिंदी
            </button>
            <button
              type="button"
              onClick={() => setChatLang("en")}
              className={`px-2 py-0.5 rounded-lg transition-all ${
                chatLang === "en"
                  ? "bg-white text-black shadow-sm font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              EN
            </button>
          </div>

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
            className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold border transition-all ${
              isVoiceEnabled
                ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            {isVoiceEnabled ? <Volume2 className="h-3 w-3 text-indigo-400" /> : <VolumeX className="h-3 w-3" />}
            <span className="hidden sm:inline">{isVoiceEnabled ? "Voice ON" : "Voice"}</span>
          </button>

          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
            {chatLang === "hi" ? "सक्रिय" : "Online"}
          </span>
        </div>
      </div>

      {/* Preset Action Buttons (2x2 Grid) */}
      <div className="border-b border-zinc-800/80 bg-zinc-950/60 p-2 grid grid-cols-2 gap-1.5">
        {currentPresets.map((preset, idx) => (
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
                    <span className="text-[10px] font-bold tracking-wide flex items-center gap-1 text-cyan-400">
                      {msg.agentType === "DISPATCH"
                        ? "🤖 Smart Route Advisor"
                        : msg.agentType === "EVENT_INTEL"
                        ? "⚡ Live Event Surge Alert"
                        : msg.agentType === "SYSTEM_GUARD"
                        ? "🛡️ Route & Weather Safety"
                        : "🤖 Uber Copilot"}
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
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  isDriver
                    ? "bg-indigo-600 text-white rounded-br-sm shadow-md shadow-indigo-600/20"
                    : "bg-zinc-950 border border-zinc-800/90 text-zinc-200 rounded-bl-sm shadow-md"
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>

                {/* Actionable Dispatch Badge */}
                {msg.actionableRecommendation && (
                  <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-medium">
                    <span className="text-amber-400 flex items-center gap-1 font-bold">
                      <Sparkles className="h-3 w-3" />
                      {msg.actionableRecommendation.suggestedZone} &bull; {msg.actionableRecommendation.estimatedSurge}x
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {msg.actionableRecommendation.extraEarningsEstimate}
                    </span>
                  </div>
                )}
              </div>

              {/* User-Friendly Verification Trace */}
              {msg.routingTrace && (
                <div className="w-full max-w-[85%]">
                  <button
                    type="button"
                    onClick={() => setExpandedTraceId(isExpanded ? null : msg.id)}
                    className="flex items-center gap-1 text-[10px] text-emerald-400/80 hover:text-emerald-300 transition-colors px-1 font-medium"
                  >
                    <ShieldCheck className="h-3 w-3 text-emerald-400" />
                    <span>✓ Real-time traffic &amp; route verified ({msg.routingTrace.latencyMs}ms)</span>
                    {isExpanded ? <ChevronUp className="h-2.5 w-2.5 ml-1" /> : <ChevronDown className="h-2.5 w-2.5 ml-1" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-1.5 rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-[10px] text-zinc-300 space-y-1.5 animate-fadeIn">
                      <div className="flex justify-between border-b border-zinc-800/80 pb-1">
                        <span className="text-zinc-400">Recommendation Accuracy:</span>
                        <span className="text-emerald-400 font-bold">
                          {(msg.routingTrace.confidenceScore * 100).toFixed(1)}% High Confidence
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-800/80 pb-1">
                        <span className="text-zinc-400">Live Decision Speed:</span>
                        <span className="text-cyan-300 font-mono">{msg.routingTrace.latencyMs}ms instant response</span>
                      </div>
                      <div className="space-y-1 pt-0.5">
                        <span className="text-zinc-400 text-[9px] block">Verified Real-Time Signals:</span>
                        <div className="flex flex-wrap gap-1">
                          <span className="rounded-md bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-200">
                            🚦 Live Google Traffic
                          </span>
                          <span className="rounded-md bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-200">
                            👥 Passenger Demand Surge
                          </span>
                          <span className="rounded-md bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-200">
                            🎯 Shift Earnings Goal
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <span className="text-[9px] font-mono text-zinc-600 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300 max-w-[70%]">
            <div className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
            <span className="font-mono text-[11px]">
              {chatLang === "hi" ? "माइकल एंजेलो एजेंट रूटिंग क्वेरी संसाधित कर रहा है..." : "Michelangelo agent routing query..."}
            </span>
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
          title={
            isListening
              ? chatLang === "hi" ? "सुन रहा हूँ... (रोकने के लिए क्लिक करें)" : "Listening... (Click to stop)"
              : chatLang === "hi" ? "हिंदी में बोलकर पूछें" : "Speak to Driver Copilot"
          }
          className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
            isListening
              ? "border-rose-500 bg-rose-500/20 text-rose-400 animate-pulse ring-2 ring-rose-500/40"
              : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
          }`}
        >
          <Mic className="h-4 w-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isListening
              ? chatLang === "hi" ? "आपकी आवाज़ सुनी जा रही है... बोलिए" : "Listening to your voice..."
              : chatLang === "hi"
              ? "उबर कॉपायलट से पूछें (उदा. 'कहाँ जाऊँ?', 'ट्रैफिक कैसा है?')..."
              : "Ask copilot (e.g., 'Where is highest surge?')..."
          }
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
