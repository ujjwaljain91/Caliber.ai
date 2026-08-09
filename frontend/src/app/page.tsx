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

export default function AppEntryPage() {
  const router = useRouter();
  const { user, isAuthenticated, openAuthModal, logout, justLoggedIn, clearJustLoggedIn } = useAuth();
  
  // viewState: "LANDING" (unauthenticated public landing page) | "WORKSPACE" (authenticated liquid glass workspace)
  const [viewState, setViewState] = useState<"LANDING" | "WORKSPACE">("LANDING");
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

  // Sync auth state updates to return to landing if signed out
  useEffect(() => {
    if (!isAuthenticated) {
      setViewState("LANDING");
    }
  }, [isAuthenticated]);

  // Transition to workspace if user just completed login/registration modal flow
  useEffect(() => {
    if (isAuthenticated && justLoggedIn) {
      setViewState("WORKSPACE");
      clearJustLoggedIn();
    }
  }, [isAuthenticated, justLoggedIn]);

  useEffect(() => {
    if (viewState === "WORKSPACE" && selectedCandidateId) {
      fetchDashboardData(selectedCandidateId);
    }
  }, [viewState, selectedCandidateId]);

  const handleAuthSuccess = () => {
    setViewState("WORKSPACE");
  };

  useEffect(() => {
    window.addEventListener("caliber-auth-success", handleAuthSuccess);
    return () => window.removeEventListener("caliber-auth-success", handleAuthSuccess);
  }, []);

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

  // ──────────────────────────────────────────────
  // MODE A: PUBLIC MARKETING LANDING PAGE
  // ──────────────────────────────────────────────
  if (viewState === "LANDING") {
    return (
      <main className="flex-1 flex flex-col bg-canvas text-text min-h-screen relative overflow-hidden selection:bg-accent selection:text-white">
        
        {/* Background Refracted Liquid Orbs */}
        <div className="absolute top-[-100px] left-[10%] w-[500px] h-[500px] rounded-full bg-accent/15 blur-[120px] pointer-events-none animate-orb-1" />
        <div className="absolute top-[40%] right-[-100px] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[140px] pointer-events-none animate-orb-2" />

        {/* Floating Liquid Glass Header Navbar */}
        <header className="sticky top-3 z-40 max-w-7xl mx-auto px-4 w-full">
          <div className="rounded-3xl liquid-glass-elevated px-6 h-16 flex items-center justify-between shadow-2xl border border-white/15">
            <div className="flex items-center gap-3 cursor-pointer group">
              <img 
                src="/logo-icon-clean.png" 
                alt="Caliber AI Logo" 
                className="h-14 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,64,0,0.4)] group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            <nav className="hidden md:flex items-center gap-6 text-xs text-muted font-semibold">
              <a href="#features" className="hover:text-white transition-colors">Capabilities</a>
              <a href="#workflow" className="hover:text-white transition-colors">Evaluation Workflow</a>
              <a href="#architecture" className="hover:text-white transition-colors font-mono">LangGraph Engine</a>
            </nav>

            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <button
                  onClick={() => setViewState("WORKSPACE")}
                  className="px-5 py-2.5 rounded-2xl bg-accent text-white font-bold text-xs shadow-xl shadow-accent/25 hover:bg-accent-hover transition-all hover:-translate-y-0.5"
                >
                  Launch Dashboard →
                </button>
              ) : (
                <>
                  <button
                    onClick={() => openAuthModal("LOGIN")}
                    className="px-4 py-2 rounded-2xl liquid-glass-pill text-xs font-semibold text-text hover:text-white transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => openAuthModal("REGISTER")}
                    className="px-5 py-2.5 rounded-2xl bg-accent text-white font-bold text-xs shadow-xl shadow-accent/25 hover:bg-accent-hover transition-all hover:-translate-y-0.5"
                  >
                    Create Account →
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-20 px-6 border-b border-white/10 flex-1">
          <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full liquid-glass-accent text-accent text-xs font-semibold animate-fade-in shadow-lg">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Autonomous Engineering Assessment Platform
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight animate-fade-in-up">
              Evaluate Technical Talent with <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-text via-text-secondary to-accent bg-clip-text text-transparent">
                Uncompromised Rigor
              </span>
            </h1>

            <p className="text-base sm:text-lg text-muted/80 max-w-2xl mx-auto animate-fade-in-up delay-1 leading-relaxed font-normal">
              Caliber AI delivers dynamic multi-turn technical assessments, intelligent answer probing, and objective competency analytics to evaluate senior engineering talent with unyielding precision.
            </p>

            <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-2">
              {isAuthenticated ? (
                <button
                  onClick={() => setViewState("WORKSPACE")}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-accent text-white font-bold text-sm shadow-2xl shadow-accent/30 hover:bg-accent-hover hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <span>Launch Candidate Workspace →</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => openAuthModal("LOGIN")}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-accent text-white font-bold text-sm shadow-2xl shadow-accent/30 hover:bg-accent-hover hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <span>Sign In to Candidate Dashboard →</span>
                  </button>

                  <button
                    onClick={() => openAuthModal("REGISTER")}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl liquid-glass-pill font-semibold text-sm hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 text-text"
                  >
                    <span>Create Free Account</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Value Metrics Bar */}
          <div className="max-w-6xl mx-auto mt-16 grid grid-cols-2 md:grid-cols-4 gap-5 animate-fade-in delay-3 relative z-10">
            <div className="liquid-glass p-6 rounded-3xl text-center hover:-translate-y-1 transition-all duration-300">
              <p className="text-2xl sm:text-3xl font-black text-accent font-sans">Adaptive Probing</p>
              <p className="text-xs text-muted/80 mt-1 font-medium">Dynamic Multi-Turn Logic</p>
            </div>
            <div className="liquid-glass p-6 rounded-3xl text-center hover:-translate-y-1 transition-all duration-300">
              <p className="text-2xl sm:text-3xl font-black text-text font-sans">Intent Memory</p>
              <p className="text-xs text-muted/80 mt-1 font-medium font-mono">Breeth AI Layer</p>
            </div>
            <div className="liquid-glass p-6 rounded-3xl text-center hover:-translate-y-1 transition-all duration-300">
              <p className="text-2xl sm:text-3xl font-black text-success font-sans">Depth Detection</p>
              <p className="text-xs text-muted/80 mt-1 font-medium">Real-Time Rigor Verification</p>
            </div>
            <div className="liquid-glass p-6 rounded-3xl text-center hover:-translate-y-1 transition-all duration-300">
              <p className="text-2xl sm:text-3xl font-black text-text font-mono">0 - 100 Score</p>
              <p className="text-xs text-muted/80 mt-1 font-medium">Calibrated Assessment Rubric</p>
            </div>
          </div>
        </section>

        {/* ─── Capabilities Grid Section ─── */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-b border-white/10 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold text-accent uppercase tracking-widest">Platform Capabilities</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-2 text-white">Built for Deep Technical Verification</h2>
            <p className="text-sm text-muted mt-2">
              Designed to move past simple trivia memory and evaluate actual system engineering trade-offs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="liquid-glass p-8 rounded-3xl hover:-translate-y-1.5 transition-all duration-500 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2 text-white">Staff Assessor Persona</h3>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                Generates scenario-based technical questions probing complex architectures, schema validation limits, and real-world failure modes.
              </p>
            </div>

            <div className="liquid-glass p-8 rounded-3xl hover:-translate-y-1.5 transition-all duration-500 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M9.75 3.104c.251.023.501.05.75.082" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2 text-white">Breeth AI Memory</h3>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                Tracks candidate reasoning trajectories across turns, preventing redundant questions and probing deeper on key architectural nuances.
              </p>
            </div>

            <div className="liquid-glass p-8 rounded-3xl hover:-translate-y-1.5 transition-all duration-500 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2 text-white">Multi-Dimensional Analytics</h3>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                Evaluates Answer Depth, Accuracy, and Trade-off Awareness to produce objective, boardroom-ready candidate assessments.
              </p>
            </div>
          </div>
        </section>

        {/* ─── Workflow Section ─── */}
        <section id="workflow" className="max-w-7xl mx-auto px-6 py-20 border-b border-white/10 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold text-accent uppercase tracking-widest">Evaluation Process</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-2 text-white">How Caliber AI Operates</h2>
            <p className="text-sm text-muted mt-2">From candidate selection to final report synthesis</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="liquid-glass p-8 rounded-3xl relative hover:-translate-y-1 transition-all duration-300 shadow-xl">
              <span className="text-4xl font-black text-accent/40 mb-4 block font-mono">01</span>
              <h3 className="text-lg font-bold mb-2 text-white">Select Candidate Profile</h3>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                Select a candidate profile from the directory to load their background curriculum objectives and historical skill domains.
              </p>
            </div>

            <div className="liquid-glass p-8 rounded-3xl relative hover:-translate-y-1 transition-all duration-300 shadow-xl">
              <span className="text-4xl font-black text-accent/40 mb-4 block font-mono">02</span>
              <h3 className="text-lg font-bold mb-2 text-white">Adaptive Evaluation Loop</h3>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                Conduct live adaptive assessment turns. Automatically triggers targeted follow-up prompts whenever answers lack trade-off depth.
              </p>
            </div>

            <div className="liquid-glass p-8 rounded-3xl relative hover:-translate-y-1 transition-all duration-300 shadow-xl">
              <span className="text-4xl font-black text-accent/40 mb-4 block font-mono">03</span>
              <h3 className="text-lg font-bold mb-2 text-white">Executive Synthesis</h3>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                Synthesize overall score (0-100), topic breakdowns, candidate strengths, gaps, and actionable recommended next learning steps.
              </p>
            </div>
          </div>

          <div className="mt-14 text-center">
            {isAuthenticated ? (
              <button
                onClick={() => setViewState("WORKSPACE")}
                className="px-8 py-4 rounded-2xl bg-accent text-white font-bold text-sm shadow-2xl shadow-accent/30 hover:bg-accent-hover hover:-translate-y-0.5 transition-all duration-300 inline-flex items-center gap-2"
              >
                <span>Launch Candidate Evaluation Workspace →</span>
              </button>
            ) : (
              <button
                onClick={() => openAuthModal("LOGIN")}
                className="px-8 py-4 rounded-2xl bg-accent text-white font-bold text-sm shadow-2xl shadow-accent/30 hover:bg-accent-hover hover:-translate-y-0.5 transition-all duration-300 inline-flex items-center gap-2"
              >
                <span>Sign In to Launch Assessment Workspace →</span>
              </button>
            )}
          </div>
        </section>

        {/* Detailed Apple Liquid Footer */}
        <footer className="border-t border-white/10 bg-canvas/30 backdrop-blur-xl pt-16 pb-12 px-6 relative z-10">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo-icon-clean.png" 
                  alt="Caliber AI" 
                  className="h-8 w-auto object-contain drop-shadow-[0_0_10px_rgba(255,64,0,0.4)]"
                />
                <span className="text-sm font-black tracking-wider text-white font-mono leading-none">CALIBER AI</span>
              </div>
              <p className="text-xs text-muted leading-relaxed font-normal">
                Enterprise-grade AI-powered technical interview engine designed for AI cohort graduates and engineering organizations.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text mb-4">Capabilities</h4>
              <ul className="space-y-2.5 text-xs text-muted font-normal">
                <li><a href="#features" className="hover:text-text transition-colors">Adaptive Probing Logic</a></li>
                <li><a href="#features" className="hover:text-text transition-colors">Cognitive Intent Memory</a></li>
                <li><a href="#features" className="hover:text-text transition-colors">Calibrated Assessment</a></li>
                <li><a href="#features" className="hover:text-text transition-colors">Real-Time Probing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text mb-4">Platform</h4>
              <ul className="space-y-2.5 text-xs text-muted font-normal">
                <li>
                  <button 
                    onClick={() => {
                      if (isAuthenticated) {
                        setViewState("WORKSPACE");
                      } else {
                        openAuthModal("LOGIN");
                      }
                    }} 
                    className="hover:text-text transition-colors cursor-pointer"
                  >
                    Candidate Dashboard
                  </button>
                </li>
                <li><a href="#workflow" className="hover:text-text transition-colors">Evaluation Workflow</a></li>
                <li><a href="#features" className="hover:text-text transition-colors">Scoring Rubrics</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text mb-4">System Status</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-success font-semibold">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  Assessment Engine: Active
                </div>
                <p className="text-[11px] text-muted leading-relaxed font-normal">
                  Calibrated Technical Assessment Service — Fully operational for multi-turn evaluations.
                </p>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-muted/70 gap-4">
            <p>© 2026 Caliber AI Inc. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span>Terms of Service</span>
              <span>Privacy Policy</span>
              <span>Security</span>
            </div>
          </div>
        </footer>
      </main>
    );
  }

  // ──────────────────────────────────────────────
  // MODE B: AUTHENTICATED APPLE LIQUID GLASS WORKSPACE
  // ──────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-canvas text-text overflow-hidden font-sans selection:bg-accent selection:text-white relative">
      
      {/* Background Refracted Liquid Orbs */}
      <div className="absolute top-[-150px] left-[15%] w-[600px] h-[600px] rounded-full bg-accent/15 blur-[140px] pointer-events-none animate-orb-1 z-0" />
      <div className="absolute bottom-[-100px] right-[10%] w-[700px] h-[700px] rounded-full bg-blue-600/10 blur-[160px] pointer-events-none animate-orb-2 z-0" />
      <div className="absolute top-[35%] left-[50%] -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[150px] pointer-events-none animate-liquid-pulse z-0" />

      {/* EXECUTIVE LEFT SIDEBAR (APPLE LIQUID GLASS) */}
      <aside className="w-64 liquid-glass-elevated border-r border-white/15 flex flex-col justify-between shrink-0 z-30 select-none backdrop-blur-3xl shadow-2xl relative">
        
        {/* Brand Emblem */}
        <div>
          <div className="h-16 px-5 border-b border-white/15 flex items-center gap-3">
            <img 
              src="/logo-icon-clean.png" 
              alt="Caliber AI Logo" 
              className="h-9 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,64,0,0.5)]"
            />
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-wider text-white font-mono leading-none">CALIBER AI</span>
              <span className="text-[10px] text-accent font-extrabold tracking-widest uppercase mt-0.5">Assessor Studio</span>
            </div>
          </div>

          {/* Sidebar Liquid Nav Tabs */}
          <nav className="p-3 space-y-2 mt-2">
            <button
              onClick={() => setActiveTab("DASHBOARD")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 ${
                activeTab === "DASHBOARD"
                  ? "bg-accent text-white shadow-xl shadow-accent/30 border border-accent-hover"
                  : "liquid-glass-pill text-muted hover:text-white"
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
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 ${
                activeTab === "CANDIDATES"
                  ? "bg-accent text-white shadow-xl shadow-accent/30 border border-accent-hover"
                  : "liquid-glass-pill text-muted hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                <span>Demo Candidates</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-white/10 px-2 py-0.5 rounded-full text-muted border border-white/10">
                {candidates.length || 20}
              </span>
            </button>
          </nav>
        </div>

        {/* Liquid User Account Capsule */}
        <div className="p-3 border-t border-white/15 space-y-2">
          <div className="liquid-glass p-3 rounded-2xl border border-white/15 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-accent/20 border border-accent/40 text-accent font-black flex items-center justify-center text-xs shrink-0 shadow-md">
                {user?.name ? user.name.charAt(0) : "A"}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{user?.name || "Evaluator"}</p>
                <p className="text-[10px] text-muted truncate font-mono">{user?.role || "Staff Assessor"}</p>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                setViewState("LANDING");
              }}
              title="Sign Out to Landing Page"
              className="p-1.5 rounded-xl hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors shrink-0 border border-transparent hover:border-red-500/30"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN WORKSPACE CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative z-10">
        
        {/* Workspace Top Header Bar */}
        <header className="h-16 border-b border-white/15 px-8 flex items-center justify-between sticky top-0 liquid-glass-elevated z-20 shrink-0 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted uppercase tracking-wider font-semibold">Workspace</span>
            <span className="text-muted/40">/</span>
            <span className="text-xs font-bold text-white tracking-tight font-sans">
              {activeTab === "DASHBOARD" ? "Personalized Candidate Dashboard" : "Demo Candidates Directory"}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full liquid-glass-success text-emerald-400 font-semibold border border-emerald-500/30 shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              LangGraph Engine: Active
            </div>
          </div>
        </header>

        {/* TAB 1: PERSONALIZED CANDIDATE DASHBOARD (APPLE LIQUID GLASS) */}
        {activeTab === "DASHBOARD" && (
          <div className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-in">
            
            {/* Candidate Overview Header Card */}
            <div className="rounded-3xl liquid-glass-elevated p-6 sm:p-8 border border-white/20 relative overflow-hidden shadow-2xl space-y-6">
              
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex items-center gap-3">
                  <span className="px-3.5 py-1 rounded-full liquid-glass-accent text-accent font-mono text-xs font-black uppercase tracking-wider shadow-md">
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

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-accent/20 border border-accent/40 text-accent text-2xl font-black flex items-center justify-center shadow-lg shrink-0">
                      {(dashboardData?.candidate.member.name || activeCandidate?.member?.name || "S").charAt(0)}
                    </div>

                    <div className="flex-1 relative">
                      <p className="text-xs text-muted font-mono uppercase tracking-wider mb-1 font-semibold">Active Candidate Profile</p>
                      
                      {/* Custom Liquid Glass Candidate Switcher Button */}
                      <button
                        onClick={() => setCandidateDropdownOpen(!candidateDropdownOpen)}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl liquid-glass border border-white/25 text-white font-extrabold text-lg hover:border-accent/60 transition-all text-left shadow-lg"
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
                          <div className="absolute left-0 top-full mt-2 w-full rounded-2xl liquid-glass-elevated border border-white/20 p-2 shadow-2xl z-50 animate-fade-in max-h-60 overflow-y-auto backdrop-blur-3xl">
                            {candidates.map((c) => (
                              <button
                                key={c.member.id}
                                onClick={() => {
                                  setSelectedCandidateId(c.member.id);
                                  setCandidateDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                                  c.member.id === selectedCandidateId
                                    ? "bg-accent text-white shadow-md shadow-accent/25"
                                    : "text-gray-200 hover:bg-white/15 hover:text-white"
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
                    <span className="px-2.5 py-1 rounded-lg liquid-glass border border-white/10 text-white font-semibold">
                      {dashboardData?.candidate.member.jobRole || activeCandidate?.member?.jobRole}
                    </span>
                    <span>•</span>
                    <span>{dashboardData?.candidate.member.yearsExperience || activeCandidate?.member?.yearsExperience} YOE</span>
                    <span>•</span>
                    <span>{dashboardData?.candidate.member.education || activeCandidate?.member?.education}</span>
                  </div>
                </div>

                {/* Readiness Score Index Liquid Glass Box */}
                <div className="lg:col-span-5 liquid-glass-accent p-5 rounded-2xl border border-accent/30 flex items-center justify-between shadow-xl">
                  <div className="flex items-center gap-4">
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

                  <div className="text-right pl-4 border-l border-white/15">
                    <p className="text-[10px] text-muted font-mono font-bold uppercase tracking-wider">Curriculum</p>
                    <p className="text-lg font-black text-white font-mono">
                      {dashboardData?.completed_curriculum_days || 28}<span className="text-muted text-xs">/31</span>
                    </p>
                    <p className="text-[10px] text-accent font-bold mt-0.5">90% Done</p>
                  </div>
                </div>
              </div>

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
                    className="w-full sm:w-auto px-5 py-3.5 rounded-2xl liquid-glass-pill border border-white/15 text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
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

            {/* Competency Matrix */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Competency Matrix</h2>
                  <p className="text-xs text-muted">Core engineering curriculum evaluation across 5 specialized domains</p>
                </div>
                <span className="text-xs font-mono font-bold text-accent liquid-glass-accent px-3 py-1 rounded-full border border-accent/30">
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
                  <div key={mod.module_id} className="rounded-3xl liquid-glass p-6 border border-white/15 hover:border-accent/40 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-xl">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted liquid-glass px-2.5 py-1 rounded-lg">
                          {mod.days_range}
                        </span>

                        <span className={`text-[11px] font-bold px-3 py-0.5 rounded-full border ${
                          mod.status === "Mastered"
                            ? "liquid-glass-success text-emerald-400 border-emerald-500/40"
                            : mod.status === "In Progress"
                            ? "liquid-glass text-blue-400 border-blue-500/40"
                            : "liquid-glass-warning text-amber-400 border-amber-500/40"
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
                              mod.score >= 90 ? "bg-emerald-500 shadow-md shadow-emerald-500/30" : mod.score >= 80 ? "bg-accent shadow-md shadow-accent/30" : "bg-amber-500"
                            }`}
                            style={{ width: `${mod.score}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {mod.key_skills.map((skill, idx) => (
                          <span key={idx} className="text-[10px] font-medium text-gray-200 liquid-glass px-2 py-0.5 rounded-md border border-white/10">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Breeth AI Cognitive Profile */}
            <div className="rounded-3xl liquid-glass-elevated p-6 sm:p-8 border border-white/20 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-accent/20 border border-accent/40 text-accent flex items-center justify-center font-bold text-lg shadow-md">
                    🧠
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Breeth AI Cognitive Reasoning Profile</h2>
                    <p className="text-xs text-muted">Active candidate reasoning trajectory &amp; intent-aware memory insights</p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold text-accent liquid-glass-accent px-3 py-1 rounded-2xl border border-accent/30 shrink-0">
                  Memory Endpoint: Active
                </span>
              </div>

              <p className="text-xs sm:text-sm text-gray-200 leading-relaxed liquid-glass p-4 rounded-2xl border border-white/10">
                {dashboardData?.cognitive_profile.summary || "Demonstrates high-level architectural reasoning across RAG vector search, LangGraph state machine cycles, and intent-aware memory."}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <span>✓</span> Identified Reasoning Strengths
                  </h3>
                  <ul className="space-y-2 text-xs text-gray-200">
                    {(dashboardData?.cognitive_profile.strengths || [
                      "Probes edge-case state persistence in cyclic graph architectures",
                      "Strong on vector similarity search trade-offs under peak load",
                      "High precision in function calling schema error recovery",
                      "Clear understanding of SSE connection management for MCP"
                    ]).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 liquid-glass-success p-2.5 rounded-xl border border-emerald-500/30">
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
                      <li key={idx} className="flex items-start gap-2 liquid-glass-warning p-2.5 rounded-xl border border-amber-500/30">
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
                    <span key={idx} className="px-3 py-1 rounded-xl text-xs font-bold liquid-glass-accent text-accent border border-accent/40 font-mono shadow-md">
                      #{pattern}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Assessment Session History Table */}
            <div className="rounded-3xl liquid-glass p-6 sm:p-8 border border-white/15 space-y-5 shadow-2xl">
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
                            className="px-3 py-1.5 rounded-xl liquid-glass-pill border border-accent/40 text-accent font-bold hover:bg-accent hover:text-white transition-all text-xs"
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

        {/* TAB 2: DEMO CANDIDATES DIRECTORY */}
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

              <div className="flex items-center gap-1.5 p-1.5 rounded-2xl liquid-glass border border-white/15 text-xs shrink-0">
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
                  className="w-full pl-11 pr-4 py-3 rounded-2xl liquid-glass text-sm text-white
                             placeholder:text-muted/50 focus:outline-none focus:border-accent/60
                             transition-all duration-300 shadow-lg"
                />
              </div>
            </div>

            {loadingCandidates ? (
              <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
                  <p className="text-xs text-muted font-medium">Loading candidate catalog...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4 max-w-md text-center p-8 rounded-3xl liquid-glass-error">
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

      {/* Loading Overlay */}
      {starting && (
        <div className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-2xl flex items-center justify-center">
          <div className="flex flex-col items-center gap-5 p-8 rounded-3xl liquid-glass-elevated border border-white/20 shadow-2xl text-center max-w-sm animate-fade-in">
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
