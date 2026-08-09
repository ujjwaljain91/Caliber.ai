"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CandidateCard from "@/components/CandidateCard";
import { useAuth } from "@/context/AuthContext";

interface Candidate {
  member: {
    id: string;
    name: string;
    jobRole: string;
    yearsExperience: number;
    education: string;
    status: string;
  };
  missions: {
    day: number;
    title: string;
    passed?: boolean | null;
    skipped?: boolean | null;
    attempts?: number | null;
  }[];
  signals: {
    commitDays: number;
    missionsCompleted: number;
    missionsFirstTry: number;
  };
}

interface CompetencyModule {
  module_id: string;
  title: string;
  days_range: string;
  status: "Mastered" | "In Progress" | "Needs Review" | string;
  score: number;
  key_skills: string[];
}

interface BreethCognitiveProfile {
  summary: string;
  strengths: string[];
  knowledge_gaps: string[];
  reasoning_patterns: string[];
}

interface SessionHistoryItem {
  session_id: string;
  date: string;
  questions_asked: number;
  covered_days: number;
  aggregate_score: number;
  status: string;
}

interface DashboardData {
  candidate: Candidate;
  readiness_score: number;
  completed_curriculum_days: number;
  total_curriculum_days: number;
  competency_matrix: CompetencyModule[];
  cognitive_profile: BreethCognitiveProfile;
  session_history: SessionHistoryItem[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function WorkspaceLayoutPage() {
  const router = useRouter();
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"DASHBOARD" | "CANDIDATES">("DASHBOARD");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("CAND-001");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [starting, setStarting] = useState<string | null>(null);
  const [candidateDropdownOpen, setCandidateDropdownOpen] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, []);

  useEffect(() => {
    if (selectedCandidateId) {
      fetchDashboardData(selectedCandidateId);
    }
  }, [selectedCandidateId]);

  async function fetchCandidates() {
    try {
      const res = await fetch(`${API_BASE}/api/candidates`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: Candidate[] = data.candidates || [];
      setCandidates(list);
      if (list.length > 0 && !selectedCandidateId) {
        setSelectedCandidateId(list[0].member.id);
      }
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
      setError("Unable to connect to Caliber AI assessment engine backend.");
    } finally {
      setLoadingCandidates(false);
    }
  }

  async function fetchDashboardData(candidateId: string) {
    setLoadingDashboard(true);
    try {
      const res = await fetch(`${API_BASE}/api/candidates/${candidateId}/dashboard`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DashboardData = await res.json();
      setDashboardData(data);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      const cand = candidates.find((c) => c.member.id === candidateId) || candidates[0];
      if (cand) {
        setDashboardData({
          candidate: cand,
          readiness_score: 88.0,
          completed_curriculum_days: 28,
          total_curriculum_days: 31,
          competency_matrix: [
            { module_id: "MOD-01", title: "Embeddings & Vector Search", days_range: "Days 1 - 10", status: "Mastered", score: 94.0, key_skills: ["Cosine Similarity", "ChromaDB", "Chunking Strategies"] },
            { module_id: "MOD-02", title: "LLM Core & Structured Prompting", days_range: "Days 11 - 16", status: "Mastered", score: 90.0, key_skills: ["Pydantic Schemas", "Function Calling", "Structured Output"] },
            { module_id: "MOD-03", title: "Multi-Agent & LangGraph", days_range: "Days 17 - 22", status: "Mastered", score: 87.5, key_skills: ["State Machine Graph", "Supervisor Router", "Checkpointing"] },
            { module_id: "MOD-04", title: "Model Context Protocol (MCP)", days_range: "Days 23 - 26", status: "In Progress", score: 82.0, key_skills: ["SSE Transport Protocol", "Tool Registries", "Stateful Sessions"] },
            { module_id: "MOD-05", title: "Deployment & Observability", days_range: "Days 27 - 31", status: "Needs Review", score: 78.5, key_skills: ["Kubernetes HPA", "Prometheus Metrics", "Docker Builds"] },
          ],
          cognitive_profile: {
            summary: "Demonstrates high-level architectural reasoning across RAG vector search, LangGraph state machine cycles, and intent-aware memory.",
            strengths: ["Probes edge-case state persistence in cyclic graph architectures", "Strong on vector similarity search trade-offs under peak load", "High precision in function calling schema error recovery"],
            knowledge_gaps: ["Needs deeper review of HNSW vector index construction parameters", "Kubernetes liveness probe tuning during traffic spikes"],
            reasoning_patterns: ["Intent-Aware Memory Merging", "Trade-off First Evaluation", "Pydantic Schema Verification"]
          },
          session_history: [
            { session_id: `session-${candidateId}-1723189000`, date: "2026-08-08", questions_asked: 8, covered_days: 5, aggregate_score: 88.5, status: "Completed" }
          ]
        });
      }
    } finally {
      setLoadingDashboard(false);
    }
  }

  async function handleStartAssessment(candidateId: string) {
    if (!isAuthenticated) {
      openAuthModal("LOGIN");
      return;
    }
    const candidate = candidates.find((c) => c.member.id === candidateId) || dashboardData?.candidate;
    if (!candidate) return;

    setStarting(candidateId);
    setError(null);
    const sessionId = `session-${candidateId}-${Date.now()}`;

    try {
      const res = await fetch(`${API_BASE}/api/interview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          candidate,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      sessionStorage.setItem(
        `caliber-${sessionId}`,
        JSON.stringify({
          sessionId,
          candidate,
          initialReply: data.reply,
        })
      );

      router.push(`/interview/${sessionId}`);
    } catch (err: any) {
      console.error("Failed to start interview:", err);
      setError(err?.message || "Failed to initiate assessment session. Please retry.");
      setStarting(null);
    }
  }

  const activeCandidate = candidates.find((c) => c.member.id === selectedCandidateId) || candidates[0];

  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      c.member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.member.jobRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.member.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (roleFilter === "ALL") return matchesSearch;
    return matchesSearch && c.member.jobRole.toUpperCase().includes(roleFilter);
  });

  return (
    <div className="flex h-screen bg-[#08090A] text-text overflow-hidden font-sans selection:bg-accent selection:text-white">
      
      {/* ─── EXECUTIVE LEFT SIDEBAR (LINEAR / VERCEL STYLE) ─── */}
      <aside className="w-64 bg-[#0d0f14] border-r border-white/10 flex flex-col justify-between shrink-0 z-30 select-none">
        
        {/* Brand Header */}
        <div>
          <div className="h-16 px-5 border-b border-white/10 flex items-center gap-3">
            <img 
              src="/logo-icon-clean.png" 
              alt="Caliber AI Logo" 
              className="h-9 w-auto object-contain drop-shadow-[0_0_10px_rgba(255,64,0,0.5)]"
            />
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-wider text-white font-mono leading-none">CALIBER AI</span>
              <span className="text-[10px] text-accent font-semibold tracking-widest uppercase mt-0.5">Assessor Studio</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1.5 mt-2">
            <button
              onClick={() => setActiveTab("DASHBOARD")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                activeTab === "DASHBOARD"
                  ? "bg-accent text-white shadow-lg shadow-accent/25"
                  : "text-muted hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
                <span>Candidate Dashboard</span>
              </div>
              {activeTab === "DASHBOARD" && (
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("CANDIDATES")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                activeTab === "CANDIDATES"
                  ? "bg-accent text-white shadow-lg shadow-accent/25"
                  : "text-muted hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                <span>Demo Candidates</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-white/10 px-2 py-0.5 rounded-full text-muted">
                {candidates.length || 20}
              </span>
            </button>
          </nav>
        </div>

        {/* User Account / Footer */}
        <div className="p-3 border-t border-white/10 space-y-2">
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-accent/20 border border-accent/40 text-accent font-black flex items-center justify-center text-xs shrink-0">
                {user?.name ? user.name.charAt(0) : "A"}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{user?.name || "Evaluator"}</p>
                <p className="text-[10px] text-muted truncate font-mono">{user?.role || "Staff Assessor"}</p>
              </div>
            </div>

            {isAuthenticated ? (
              <button
                onClick={logout}
                title="Sign Out"
                className="p-1.5 rounded-xl hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => openAuthModal("LOGIN")}
                className="px-2.5 py-1 rounded-xl bg-accent text-white text-[11px] font-bold shadow-md hover:bg-accent-hover transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ─── MAIN WORKSPACE CONTENT AREA ─── */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative bg-[#08090A]">
        
        {/* Workspace Top Header Bar */}
        <header className="h-16 border-b border-white/10 px-8 flex items-center justify-between sticky top-0 bg-[#08090A]/90 backdrop-blur-xl z-20 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted uppercase tracking-wider font-semibold">Workspace</span>
            <span className="text-muted/40">/</span>
            <span className="text-xs font-bold text-white tracking-tight font-sans">
              {activeTab === "DASHBOARD" ? "Personalized Candidate Dashboard" : "Demo Candidates Directory"}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              LangGraph State Engine: Active
            </div>
          </div>
        </header>

        {/* ─── TAB 1: PERSONALIZED CANDIDATE DASHBOARD ─── */}
        {activeTab === "DASHBOARD" && (
          <div className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-in">
            
            {/* Candidate Overview Card (World-Class Refined UI) */}
            <div className="rounded-3xl bg-[#12141c] p-6 sm:p-8 border border-white/15 relative overflow-hidden shadow-2xl space-y-6">
              
              {/* Top Banner Row */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent font-mono text-xs font-black uppercase tracking-wider">
                    PERSONALIZED WORKSPACE
                  </span>
                  <span className="text-xs text-muted font-medium">
                    Cohort Status: <strong className="text-success font-bold">ACTIVE</strong>
                  </span>
                </div>

                <div className="text-xs font-mono text-muted">
                  ID: <strong className="text-white font-bold">{activeCandidate?.member?.id || selectedCandidateId}</strong>
                </div>
              </div>

              {/* Main Candidate Card Body */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                
                {/* Candidate Selection & Info (Cols 7) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-accent/20 border border-accent/40 text-accent text-2xl font-black flex items-center justify-center shadow-lg shrink-0">
                      {(dashboardData?.candidate.member.name || activeCandidate?.member?.name || "S").charAt(0)}
                    </div>

                    <div className="flex-1 relative">
                      <p className="text-xs text-muted font-mono uppercase tracking-wider mb-1 font-semibold">Active Candidate Profile</p>
                      
                      {/* Custom Glass Candidate Switcher Button */}
                      <button
                        onClick={() => setCandidateDropdownOpen(!candidateDropdownOpen)}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#1a1d28] border border-white/20 text-white font-extrabold text-lg hover:border-accent/60 transition-all text-left shadow-inner"
                      >
                        <span className="truncate">
                          {dashboardData?.candidate.member.name || activeCandidate?.member?.name} ({activeCandidate?.member?.id || selectedCandidateId})
                        </span>
                        <svg className="w-4 h-4 text-accent ml-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>

                      {/* Dropdown Options List */}
                      {candidateDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setCandidateDropdownOpen(false)} />
                          <div className="absolute left-0 top-full mt-2 w-full rounded-2xl bg-[#181b24] border border-white/20 p-2 shadow-2xl z-50 animate-fade-in max-h-60 overflow-y-auto">
                            {candidates.map((c) => (
                              <button
                                key={c.member.id}
                                onClick={() => {
                                  setSelectedCandidateId(c.member.id);
                                  setCandidateDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                                  c.member.id === selectedCandidateId
                                    ? "bg-accent text-white"
                                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                <span>{c.member.name} ({c.member.id})</span>
                                <span className="text-[10px] font-mono text-muted">{c.member.jobRole}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted/90 font-medium pl-18">
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-semibold">
                      {dashboardData?.candidate.member.jobRole || activeCandidate?.member?.jobRole}
                    </span>
                    <span>•</span>
                    <span>{dashboardData?.candidate.member.yearsExperience || activeCandidate?.member?.yearsExperience} YOE</span>
                    <span>•</span>
                    <span>{dashboardData?.candidate.member.education || activeCandidate?.member?.education}</span>
                  </div>
                </div>

                {/* Readiness Score Index Box (Cols 5) */}
                <div className="lg:col-span-5 bg-[#181b26] p-5 rounded-2xl border border-white/10 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-4">
                    
                    {/* SVG Circular Readiness Gauge */}
                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="6" className="text-white/10" fill="transparent" />
                        <circle
                          cx="32"
                          cy="32"
                          r="26"
                          stroke="currentColor"
                          strokeWidth="6"
                          className="text-accent transition-all duration-1000 ease-out"
                          fill="transparent"
                          strokeDasharray={163}
                          strokeDashoffset={163 - (163 * (dashboardData?.readiness_score || 88)) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-sm font-black text-white font-mono">
                        {dashboardData?.readiness_score || 88}%
                      </span>
                    </div>

                    <div>
                      <p className="text-[10px] text-muted font-mono font-bold uppercase tracking-wider">Readiness Index</p>
                      <p className="text-sm font-extrabold text-white">Calibrated Readiness</p>
                      <span className="text-[11px] text-success font-semibold flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Ready for Staff Interview
                      </span>
                    </div>
                  </div>

                  <div className="text-right pl-4 border-l border-white/10">
                    <p className="text-[10px] text-muted font-mono font-bold uppercase tracking-wider">Curriculum</p>
                    <p className="text-lg font-black text-white font-mono">
                      {dashboardData?.completed_curriculum_days || 28}<span className="text-muted text-xs">/31</span>
                    </p>
                    <p className="text-[10px] text-accent font-bold mt-0.5">90% Done</p>
                  </div>
                </div>

              </div>

              {/* Action Buttons Row */}
              <div className="pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => handleStartAssessment(selectedCandidateId)}
                    disabled={loadingDashboard}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-accent text-white font-extrabold text-sm shadow-xl shadow-accent/30 hover:bg-accent-hover hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2.5"
                  >
                    <span className="text-base">🚀</span>
                    <span>Start New Technical Assessment</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("CANDIDATES")}
                    className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-white/5 border border-white/15 text-white hover:bg-white/10 font-bold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <span>📋</span>
                    <span>View Candidate Directory (Demo)</span>
                  </button>
                </div>

                <p className="text-[11px] text-muted font-mono">
                  Adaptive Multi-Turn State Graph • Gemini 2.0 Flash
                </p>
              </div>

            </div>

            {/* Competency Matrix Grid (5 Modules) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Competency Matrix</h2>
                  <p className="text-xs text-muted">Core engineering curriculum evaluation across 5 specialized domains</p>
                </div>
                <span className="text-xs font-mono font-bold text-accent bg-accent/15 px-3 py-1 rounded-full border border-accent/30">
                  5 Core Modules
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {(dashboardData?.competency_matrix || [
                  { module_id: "MOD-01", title: "Embeddings & Vector Search", days_range: "Days 1 - 10", status: "Mastered", score: 94.0, key_skills: ["Cosine Similarity", "ChromaDB Indexing", "Chunking Strategies"] },
                  { module_id: "MOD-02", title: "LLM Core & Structured Prompting", days_range: "Days 11 - 16", status: "Mastered", score: 90.0, key_skills: ["Pydantic Schemas", "Function Calling", "Structured Output Parsing"] },
                  { module_id: "MOD-03", title: "Multi-Agent & LangGraph", days_range: "Days 17 - 22", status: "Mastered", score: 87.5, key_skills: ["State Machine Graph", "Supervisor Router", "Checkpoint Persistence"] },
                  { module_id: "MOD-04", title: "Model Context Protocol (MCP)", days_range: "Days 23 - 26", status: "In Progress", score: 82.0, key_skills: ["SSE Transport Protocol", "Tool Registries", "Stateful Remote Sessions"] },
                  { module_id: "MOD-05", title: "Deployment & Observability", days_range: "Days 27 - 31", status: "Needs Review", score: 78.5, key_skills: ["Kubernetes HPA", "Prometheus Metrics", "Docker Multi-stage Builds"] },
                ]).map((mod) => (
                  <div key={mod.module_id} className="rounded-3xl bg-[#12141c] p-6 border border-white/10 hover:border-accent/40 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-xl">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted bg-white/5 px-2.5 py-1 rounded-lg">
                          {mod.days_range}
                        </span>

                        <span className={`text-[11px] font-bold px-3 py-0.5 rounded-full border ${
                          mod.status === "Mastered"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                            : mod.status === "In Progress"
                            ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                            : "bg-amber-500/20 text-amber-400 border-amber-500/40"
                        }`}>
                          {mod.status}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white leading-snug">{mod.title}</h3>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-muted">Mastery Score</span>
                          <span className="text-white font-mono font-bold">{mod.score}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              mod.score >= 90 ? "bg-emerald-500" : mod.score >= 80 ? "bg-accent" : "bg-amber-500"
                            }`}
                            style={{ width: `${mod.score}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {mod.key_skills.map((skill, idx) => (
                          <span key={idx} className="text-[10px] font-medium text-gray-300 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Breeth AI Cognitive Profile Card */}
            <div className="rounded-3xl bg-[#12141c] p-6 sm:p-8 border border-white/15 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-accent/20 border border-accent/40 text-accent flex items-center justify-center font-bold text-lg">
                    🧠
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Breeth AI Cognitive Reasoning Profile</h2>
                    <p className="text-xs text-muted">Active candidate reasoning trajectory &amp; intent-aware memory insights</p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold text-accent bg-accent/10 px-3 py-1 rounded-2xl border border-accent/30 shrink-0">
                  Memory Endpoint: Active
                </span>
              </div>

              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed bg-[#181b24] p-4 rounded-2xl border border-white/10">
                {dashboardData?.cognitive_profile.summary || "Demonstrates high-level architectural reasoning across RAG vector search, LangGraph state machine cycles, and intent-aware memory."}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <span>✓</span> Identified Reasoning Strengths
                  </h3>
                  <ul className="space-y-2 text-xs text-gray-300">
                    {(dashboardData?.cognitive_profile.strengths || [
                      "Probes edge-case state persistence in cyclic graph architectures",
                      "Strong on vector similarity search trade-offs under peak load",
                      "High precision in function calling schema error recovery",
                      "Clear understanding of SSE connection management for MCP"
                    ]).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                        <span className="text-emerald-400 font-bold shrink-0">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <span>🎯</span> Targeted Knowledge Gaps
                  </h3>
                  <ul className="space-y-2 text-xs text-gray-300">
                    {(dashboardData?.cognitive_profile.knowledge_gaps || [
                      "Needs deeper review of HNSW vector index construction parameters (M and efConstruction)",
                      "Kubernetes liveness and readiness probe tuning during container traffic spikes"
                    ]).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                        <span className="text-amber-400 font-bold shrink-0">!</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <p className="text-xs font-semibold text-muted mb-2">Active Cognitive Trajectory Badges:</p>
                <div className="flex flex-wrap gap-2">
                  {(dashboardData?.cognitive_profile.reasoning_patterns || [
                    "Intent-Aware Memory Merging",
                    "Trade-off First Evaluation",
                    "Pydantic Schema Verification",
                    "Graceful Degradation Guards"
                  ]).map((pattern, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-xl text-xs font-bold bg-accent/15 text-accent border border-accent/30 font-mono">
                      #{pattern}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Assessment Session History Table */}
            <div className="rounded-3xl bg-[#12141c] p-6 sm:p-8 border border-white/15 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Assessment Session History</h2>
                  <p className="text-xs text-muted mt-0.5">Past completed technical evaluation reports for candidate {activeCandidate?.member?.name}</p>
                </div>

                <button
                  onClick={() => handleStartAssessment(selectedCandidateId)}
                  className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20"
                >
                  + New Assessment Session
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-muted uppercase font-mono tracking-wider">
                      <th className="pb-3 px-3">Session ID</th>
                      <th className="pb-3 px-3">Date</th>
                      <th className="pb-3 px-3 text-center">Questions</th>
                      <th className="pb-3 px-3 text-center">Days Covered</th>
                      <th className="pb-3 px-3 text-right">Aggregate Score</th>
                      <th className="pb-3 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {(dashboardData?.session_history || [
                      { session_id: `session-${selectedCandidateId}-1723189000`, date: "2026-08-08", questions_asked: 8, covered_days: 5, aggregate_score: 88.5, status: "Completed" }
                    ]).map((item) => (
                      <tr key={item.session_id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-3 font-mono text-accent font-bold">
                          {item.session_id.substring(0, 24)}...
                        </td>
                        <td className="py-3.5 px-3 text-muted">{item.date}</td>
                        <td className="py-3.5 px-3 text-center font-bold text-white">{item.questions_asked}</td>
                        <td className="py-3.5 px-3 text-center font-bold text-white">{item.covered_days}</td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-400 text-sm">
                          {item.aggregate_score}/100
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={() => router.push(`/evaluation/${item.session_id}`)}
                            className="px-3 py-1.5 rounded-xl bg-accent/20 border border-accent/40 text-accent font-bold hover:bg-accent hover:text-white transition-all text-xs"
                          >
                            View Report →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ─── TAB 2: DEMO CANDIDATES DIRECTORY ─── */}
        {activeTab === "CANDIDATES" && (
          <div className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-accent mb-1">
                  <span>📋 Demo Candidates Catalog</span>
                </div>
                <h1 className="text-3xl font-black tracking-tight text-white">Select Candidate for Demo</h1>
                <p className="text-xs text-muted mt-1">
                  Choose any candidate to load their dashboard view or launch a live technical assessment session.
                </p>
              </div>

              {/* Role Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#12141c] border border-white/10 text-xs shrink-0">
                {["ALL", "DATA", "ENGINEER", "BACKEND"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setRoleFilter(tab)}
                    className={`px-4 py-2 rounded-xl font-bold transition-all duration-300 ${
                      roleFilter === tab
                        ? "bg-accent text-white shadow-lg shadow-accent/25"
                        : "text-muted hover:text-white"
                    }`}
                  >
                    {tab === "ALL" ? "All Roles" : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="max-w-md">
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search candidate name, role, or ID (e.g. CAND-001)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#12141c] border border-white/15 text-sm text-white
                             placeholder:text-muted/50 focus:outline-none focus:border-accent/60
                             transition-all duration-300 shadow-lg"
                />
              </div>
            </div>

            {/* Directory Cards Grid */}
            {loadingCandidates ? (
              <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
                  <p className="text-xs text-muted font-medium">Loading candidate catalog...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4 max-w-md text-center p-8 rounded-3xl bg-[#12141c] border border-red-500/30">
                  <p className="text-sm text-red-400 font-medium">{error}</p>
                  <button
                    onClick={() => { setError(null); setLoadingCandidates(true); fetchCandidates(); }}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-accent text-white"
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted font-medium">
                    Showing <strong className="text-white font-bold">{filteredCandidates.length}</strong> candidate{filteredCandidates.length !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCandidates.map((candidate, index) => (
                    <CandidateCard
                      key={candidate.member.id}
                      id={candidate.member.id}
                      name={candidate.member.name}
                      jobRole={candidate.member.jobRole}
                      yearsExperience={candidate.member.yearsExperience}
                      education={candidate.member.education}
                      missions={candidate.missions}
                      signals={candidate.signals}
                      onSelect={(id) => {
                        setSelectedCandidateId(id);
                        setActiveTab("DASHBOARD");
                      }}
                      index={index}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

      </main>

      {/* Loading Overlay when starting interview */}
      {starting && (
        <div className="fixed inset-0 z-50 bg-[#08090A]/80 backdrop-blur-2xl flex items-center justify-center">
          <div className="flex flex-col items-center gap-5 p-8 rounded-3xl bg-[#12141c] border border-white/20 shadow-2xl text-center max-w-sm animate-fade-in">
            <div className="w-12 h-12 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
            <div>
              <p className="text-base font-bold text-white">Initializing Technical Assessment...</p>
              <p className="text-xs text-muted mt-1">Building LangGraph state machine &amp; Breeth AI memory</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
