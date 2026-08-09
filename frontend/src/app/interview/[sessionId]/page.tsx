"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MessageBubble from "@/components/MessageBubble";

interface Message {
  role: "interviewer" | "candidate";
  content: string;
  topicDay?: number;
  topicTitle?: string;
}

interface SessionState {
  turn_count: number;
  days_covered: number[];
  current_topic_day: number;
  current_topic_title: string;
  total_topics: number;
  done: boolean;
}

interface CandidateInfo {
  member: {
    id: string;
    name: string;
    jobRole: string;
    yearsExperience: number;
    education: string;
    status: string;
  };
  signals?: {
    commitDays: number;
    missionsCompleted: number;
    missionsFirstTry: number;
  };
}

interface PastSession {
  id: string;
  candidateName: string;
  candidateId: string;
  jobRole: string;
  date: string;
  score: number;
  questionsCount: number;
  messages: Message[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  // Core interview state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [candidateInfo, setCandidateInfo] = useState<CandidateInfo | null>(null);
  const [candidateName, setCandidateName] = useState("Candidate");
  const [isDone, setIsDone] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Sidebar state
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [candidateSessions, setCandidateSessions] = useState<PastSession[]>([]);
  const [selectedPastSession, setSelectedPastSession] = useState<PastSession | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ─── Load candidate's past interview history (only this candidate) ───
  useEffect(() => {
    if (!candidateInfo?.member?.id && !candidateName) return;
    try {
      const saved = localStorage.getItem("caliber_interview_history");
      if (saved) {
        const allSessions: PastSession[] = JSON.parse(saved);
        const candidateId = candidateInfo?.member?.id || "";
        const filtered = allSessions.filter(
          (s) => s.candidateId === candidateId || s.candidateName === candidateName
        );
        setCandidateSessions(filtered);
      }
    } catch {
      // fallback — no history
    }
  }, [candidateInfo, candidateName]);

  // ─── Save current session into history (scoped to this candidate) ───
  useEffect(() => {
    if (!sessionId || messages.length === 0 || !candidateName) return;

    const candidateId = candidateInfo?.member?.id || "";
    const currentEntry: PastSession = {
      id: sessionId,
      candidateName,
      candidateId,
      jobRole: candidateInfo?.member?.jobRole || "Software Engineer",
      date: new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
      score: isDone ? 90 : Math.min(messages.length * 12, 85),
      questionsCount: Math.min(Math.floor(messages.length / 2), 8),
      messages,
    };

    try {
      const saved = localStorage.getItem("caliber_interview_history");
      const allSessions: PastSession[] = saved ? JSON.parse(saved) : [];
      const idx = allSessions.findIndex((s) => s.id === sessionId);
      if (idx >= 0) {
        allSessions[idx] = currentEntry;
      } else {
        allSessions.unshift(currentEntry);
      }
      localStorage.setItem("caliber_interview_history", JSON.stringify(allSessions));

      // Update sidebar with only this candidate's sessions
      setCandidateSessions(
        allSessions.filter((s) => s.candidateId === candidateId || s.candidateName === candidateName)
      );
    } catch {
      // storage optional
    }
  }, [messages, isDone, sessionId, candidateName, candidateInfo]);

  // ─── Load initial session data ───
  useEffect(() => {
    const stored = sessionStorage.getItem(`caliber-${sessionId}`);
    if (stored) {
      const data = JSON.parse(stored);
      setCandidateInfo(data.candidate);
      setCandidateName(data.candidate?.member?.name || "Candidate");
      if (data.initialReply) {
        setMessages([{ role: "interviewer", content: data.initialReply }]);
      }
    }
    fetchSessionState();
  }, [sessionId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming, selectedPastSession]);

  // Auto-focus input
  useEffect(() => {
    if (!isLoading && !isDone && !selectedPastSession) {
      inputRef.current?.focus();
    }
  }, [isLoading, isDone, selectedPastSession]);

  // Auto-redirect after completion
  useEffect(() => {
    if (isDone && !selectedPastSession) {
      const interval = setInterval(() => {
        setCountdown((prev) => (prev > 1 ? prev - 1 : 1));
      }, 1000);
      const timer = setTimeout(() => {
        router.push(`/evaluation/${sessionId}`);
      }, 5000);
      return () => { clearInterval(interval); clearTimeout(timer); };
    }
  }, [isDone, sessionId, router, selectedPastSession]);

  async function fetchSessionState() {
    try {
      const res = await fetch(`${API_BASE}/api/interview/${sessionId}/state`);
      if (res.ok) {
        const data = await res.json();
        setSessionState(data);
        if (data.done) setIsDone(true);
      }
    } catch { /* optional */ }
  }

  async function handleSend() {
    if (!input.trim() || isLoading || isDone || selectedPastSession) return;
    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);
    if (inputRef.current) inputRef.current.style.height = "auto";

    setMessages((prev) => [...prev, { role: "candidate", content: userMessage }]);
    setIsStreaming(true);
    setMessages((prev) => [...prev, { role: "interviewer", content: "" }]);

    try {
      const res = await fetch(`${API_BASE}/api/interview/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: userMessage }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let finalDone = false;
      let finalFeedback = null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "token") {
                  fullContent += data.content;
                  setMessages((prev) => {
                    const n = [...prev];
                    n[n.length - 1] = { ...n[n.length - 1], content: fullContent };
                    return n;
                  });
                } else if (data.type === "done") {
                  finalDone = data.done;
                  finalFeedback = data.feedback;
                }
              } catch { /* skip */ }
            }
          }
        }
      }

      setIsStreaming(false);
      await fetchSessionState();
      if (finalDone) {
        setIsDone(true);
        if (finalFeedback) {
          sessionStorage.setItem(`caliber-feedback-${sessionId}`, JSON.stringify(finalFeedback));
        }
      }
    } catch (err) {
      console.error("Stream failed, falling back:", err);
      try {
        const res = await fetch(`${API_BASE}/api/interview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message: userMessage }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setMessages((prev) => {
          const n = [...prev];
          n[n.length - 1] = { role: "interviewer", content: data.reply };
          return n;
        });
        setIsStreaming(false);
        await fetchSessionState();
        if (data.done) {
          setIsDone(true);
          if (data.feedback) {
            sessionStorage.setItem(`caliber-feedback-${sessionId}`, JSON.stringify(data.feedback));
          }
        }
      } catch {
        setMessages((prev) => {
          const n = [...prev];
          n[n.length - 1] = { role: "interviewer", content: "⚠ Rate limit reached. Re-trying next turn..." };
          return n;
        });
        setIsStreaming(false);
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const turnCount = sessionState?.turn_count ?? Math.floor(messages.length / 2);
  const questionsDisplay = Math.min(turnCount, 8);
  const displayMessages = selectedPastSession ? selectedPastSession.messages : messages;
  const pastOnly = candidateSessions.filter((s) => s.id !== sessionId);

  return (
    <main className="flex h-screen bg-canvas text-text overflow-hidden">
      {/* ─── LEFT SIDEBAR: This Candidate's Interview Sessions ─── */}
      {isLeftSidebarOpen && (
        <aside className="w-[280px] shrink-0 flex flex-col border-r border-white/10 bg-container/50 backdrop-blur-xl animate-fade-in">
          {/* Header */}
          <div className="p-4 pb-3 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/40 text-accent flex items-center justify-center text-xs font-black">
                  {candidateName.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-none">{candidateName}</p>
                  <p className="text-[10px] text-muted leading-none mt-0.5">
                    {candidateInfo?.member?.jobRole || "Candidate"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLeftSidebarOpen(false)}
                className="w-6 h-6 rounded-lg text-muted/60 hover:text-text flex items-center justify-center transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
            </div>

            <button
              onClick={() => router.push("/?view=dashboard")}
              className="w-full py-2 rounded-xl bg-accent text-white font-bold text-[11px] shadow-lg shadow-accent/20 hover:bg-accent-hover hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Assessment
            </button>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {/* Active Session — always first */}
            <button
              onClick={() => setSelectedPastSession(null)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                !selectedPastSession
                  ? "bg-accent/15 border-accent/40 shadow-md shadow-accent/10"
                  : "bg-white/[0.02] border-white/8 hover:bg-white/[0.05] hover:border-white/15"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Live Session</span>
                <span className="ml-auto text-[10px] text-muted font-mono">{questionsDisplay}/8</span>
              </div>
              <p className="text-[11px] text-text font-semibold truncate">{candidateName}</p>
              <p className="text-[10px] text-muted truncate">{candidateInfo?.member?.jobRole || "Technical Assessment"}</p>
            </button>

            {/* Past sessions for THIS candidate */}
            {pastOnly.length > 0 && (
              <div className="pt-3 pb-1">
                <p className="text-[10px] font-semibold text-muted/70 uppercase tracking-wider px-1">
                  Previous Sessions · {pastOnly.length}
                </p>
              </div>
            )}

            {pastOnly.map((session) => (
              <button
                key={session.id}
                onClick={() => setSelectedPastSession(session)}
                className={`w-full text-left p-3 rounded-xl border transition-all group ${
                  selectedPastSession?.id === session.id
                    ? "bg-accent/15 border-accent/40 shadow-md"
                    : "bg-white/[0.02] border-white/8 hover:bg-white/[0.05] hover:border-white/15"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted/70 font-mono">{session.date}</span>
                  <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full ${
                    session.score >= 90
                      ? "bg-success/20 text-success"
                      : "bg-warning/20 text-warning"
                  }`}>
                    {session.score}%
                  </span>
                </div>
                <p className="text-[11px] text-text font-semibold truncate group-hover:text-accent transition-colors">
                  {session.questionsCount} Questions · {session.messages.length} Messages
                </p>
                <p className="text-[10px] text-muted/60 mt-0.5 group-hover:text-accent/80 transition-colors">
                  View answers →
                </p>
              </button>
            ))}

            {pastOnly.length === 0 && (
              <div className="text-center py-8 px-4">
                <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-[11px] text-muted/50">No previous sessions</p>
                <p className="text-[10px] text-muted/30 mt-0.5">First interview with {candidateName}</p>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* ─── CENTER: Chat Area (flex column with sticky input) ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ─── Header ─── */}
        <header className="shrink-0 px-4 pt-3 pb-2 z-30">
          <div className="rounded-2xl liquid-glass-elevated px-4 h-12 flex items-center justify-between shadow-xl border border-white/12 max-w-4xl mx-auto">
            <div className="flex items-center gap-2.5">
              {/* Sidebar toggle */}
              <button
                onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  isLeftSidebarOpen
                    ? "bg-accent/20 text-accent"
                    : "text-muted/60 hover:text-text"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>

              {/* Back */}
              <button
                onClick={() => router.push("/?view=dashboard")}
                className="w-7 h-7 rounded-lg text-muted/60 hover:text-text flex items-center justify-center"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>

              {/* Brand */}
              <div className="flex items-center gap-2">
                <img src="/logo-icon-clean.png" alt="Caliber AI" className="h-9 w-auto object-contain drop-shadow-[0_0_6px_rgba(255,64,0,0.4)]" />
                <span className="text-muted/30 text-[10px]">·</span>
                <span className="text-[11px] text-muted/90 font-semibold truncate max-w-[160px]">
                  {selectedPastSession ? `${candidateName} (Past)` : candidateName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Progress pill */}
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                isDone && !selectedPastSession
                  ? "bg-success/15 text-success border border-success/30"
                  : "bg-white/[0.04] text-muted border border-white/10"
              }`}>
                {isDone && !selectedPastSession ? (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span>Complete</span>
                  </>
                ) : (
                  <>
                    <span className="font-mono font-bold text-text">
                      {selectedPastSession ? selectedPastSession.questionsCount : questionsDisplay}
                    </span>
                    <span className="text-muted/40">/</span>
                    <span className="font-mono">8</span>
                  </>
                )}
              </div>

              {/* Active topic */}
              {sessionState && !isDone && !selectedPastSession && (
                <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-muted/70 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/8">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  <span className="truncate max-w-[140px]">{sessionState.current_topic_title}</span>
                </div>
              )}

              {/* Right panel toggle */}
              <button
                onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  isRightSidebarOpen
                    ? "bg-accent/20 text-accent"
                    : "text-muted/60 hover:text-text"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Past session viewing banner */}
        {selectedPastSession && (
          <div className="shrink-0 mx-4 mb-2">
            <div className="max-w-4xl mx-auto bg-accent/10 border border-accent/25 rounded-xl px-4 py-2 flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-muted">Viewing past answers</span>
                <span className="text-text font-bold">{selectedPastSession.date}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-success/20 text-success font-mono font-bold">
                  {selectedPastSession.score}%
                </span>
              </div>
              <button
                onClick={() => setSelectedPastSession(null)}
                className="text-[11px] text-accent font-bold hover:underline"
              >
                ← Back to live session
              </button>
            </div>
          </div>
        )}

        {/* ─── Messages (scrollable) ─── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-6 space-y-8">
            {displayMessages.map((msg, i) => (
              <MessageBubble
                key={i}
                content={msg.content}
                role={msg.role}
                isStreaming={
                  !selectedPastSession &&
                  isStreaming &&
                  i === displayMessages.length - 1 &&
                  msg.role === "interviewer"
                }
                topicDay={msg.topicDay ?? (msg.role === "interviewer" ? sessionState?.current_topic_day : undefined)}
                topicTitle={msg.topicTitle ?? (msg.role === "interviewer" ? sessionState?.current_topic_title : undefined)}
              />
            ))}

            {/* Thinking indicator */}
            {!selectedPastSession && isLoading && !isStreaming && (
              <div className="animate-fade-in flex gap-3 items-start">
                <div className="w-7 h-7 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3.5 h-3.5 text-accent animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <p className="text-[15px] text-muted animate-shimmer-text">
                  Evaluating response &amp; synthesizing next question...
                </p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ─── Completion Card ─── */}
        {!selectedPastSession && isDone && (
          <div className="shrink-0 px-4 py-3">
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 p-4 rounded-2xl bg-success/10 border border-success/25 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-success/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-text">Interview Complete</p>
                  <p className="text-xs text-muted">8 questions evaluated · Redirecting in {countdown}s</p>
                </div>
              </div>
              <button
                onClick={() => router.push(`/evaluation/${sessionId}`)}
                className="px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-hover transition-all shadow-lg shadow-accent/25 shrink-0"
              >
                View Report →
              </button>
            </div>
          </div>
        )}

        {/* ─── Sticky Input Bar (always visible at bottom like ChatGPT/Gemini) ─── */}
        {!selectedPastSession && !isDone && (
          <div className="shrink-0 px-4 pb-4 pt-2">
            <div className="max-w-3xl mx-auto">
              <div className="relative flex items-end rounded-2xl liquid-glass-elevated border border-white/12 focus-within:border-accent/40 transition-all shadow-xl">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isLoading ? "Analyzing your response..." : "Type your technical answer..."}
                  disabled={isLoading}
                  rows={1}
                  className="flex-1 bg-transparent px-5 py-3.5 text-sm text-text placeholder:text-muted/40 resize-none focus:outline-none disabled:opacity-40 min-h-[48px] max-h-[160px] leading-relaxed"
                  style={{ height: "auto" }}
                  onInput={(e) => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = "auto";
                    t.style.height = Math.min(t.scrollHeight, 160) + "px";
                  }}
                />

                <div className="flex items-center gap-2 pr-3 pb-3">
                  <span className="text-[10px] font-mono text-muted/40">{questionsDisplay}/8</span>
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-20 enabled:bg-accent enabled:text-white enabled:shadow-md enabled:shadow-accent/30 enabled:hover:bg-accent-hover enabled:hover:scale-105 shrink-0"
                  >
                    {isLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-muted/30 text-center mt-2 font-mono">
                Shift + Enter for new line · Responses are AI-evaluated in real time
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─── RIGHT SIDEBAR: Assessment Blueprint ─── */}
      {isRightSidebarOpen && (
        <aside className="w-[280px] shrink-0 flex flex-col border-l border-white/10 bg-container/50 backdrop-blur-xl overflow-y-auto animate-fade-in">
          <div className="p-4 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                <span className="text-[11px] font-black uppercase tracking-wider text-text">Blueprint</span>
              </div>
              <button
                onClick={() => setIsRightSidebarOpen(false)}
                className="w-6 h-6 rounded-lg text-muted/60 hover:text-text flex items-center justify-center"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>

            {/* Candidate Spotlight */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-accent/20 border border-accent/40 text-accent font-black flex items-center justify-center text-xs">
                  {candidateName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{candidateName}</p>
                  <p className="text-[10px] text-muted truncate">
                    {candidateInfo?.member?.jobRole || "Software Engineer"}
                  </p>
                </div>
              </div>
              {candidateInfo?.member && (
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-muted/70 font-mono">
                  <span>{candidateInfo.member.yearsExperience} yrs exp</span>
                  <span>{candidateInfo.member.education}</span>
                </div>
              )}
            </div>

            {/* Topic Map */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-muted/70 uppercase tracking-wider">
                Evaluation Topics (8 Days)
              </p>
              <div className="space-y-1">
                {[
                  { day: 7, title: "Embeddings & Vector Indexing", passed: true },
                  { day: 8, title: "Vector Databases & Hybrid Search", passed: true },
                  { day: 10, title: "Retrieval Engines & RAG", active: true },
                  { day: 12, title: "Prompt Engineering", pending: true },
                  { day: 16, title: "Streaming APIs & Backend", pending: true },
                  { day: 22, title: "Multi-Agent Orchestration", pending: true },
                  { day: 23, title: "Model Context Protocol", pending: true },
                  { day: 31, title: "Capstone Architecture", pending: true },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] flex items-center justify-between border transition-all ${
                      item.passed
                        ? "bg-success/8 border-success/15 text-success"
                        : item.active
                        ? "bg-accent/12 border-accent/30 text-text font-semibold"
                        : "border-white/5 text-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-mono text-[9px] opacity-70">D{item.day}</span>
                      <span className="truncate">{item.title}</span>
                    </div>
                    {item.passed && (
                      <svg className="w-3 h-3 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                    {item.active && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Signals */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8 space-y-2">
              <p className="text-[10px] font-semibold text-muted/70 uppercase tracking-wider">
                Competency Signals
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: "Commit", value: candidateInfo?.signals?.commitDays || 28, color: "text-text" },
                  { label: "Missions", value: candidateInfo?.signals?.missionsCompleted || 30, color: "text-accent" },
                  { label: "1st Try", value: candidateInfo?.signals?.missionsFirstTry || 24, color: "text-success" },
                ].map((s, i) => (
                  <div key={i} className="text-center p-2 rounded-lg bg-canvas/50 border border-white/5">
                    <p className={`text-xs font-black font-mono ${s.color}`}>{s.value}</p>
                    <p className="text-[9px] text-muted/60 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick link */}
            <button
              onClick={() => router.push(`/evaluation/${selectedPastSession?.id || sessionId}`)}
              className="w-full py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] font-semibold text-muted hover:text-text hover:border-white/20 transition-all flex items-center justify-center gap-1.5"
            >
              View Evaluation Analytics →
            </button>
          </div>
        </aside>
      )}
    </main>
  );
}
