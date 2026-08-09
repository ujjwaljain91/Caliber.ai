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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LandingAndOnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [viewMode, setViewMode] = useState<"LANDING" | "CANDIDATES">("LANDING");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    fetchCandidates();
    const handleCheckView = () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("view") === "candidates" || isAuthenticated) {
          setViewMode("CANDIDATES");
        } else {
          setViewMode("LANDING");
        }
      }
    };
    handleCheckView();
    window.addEventListener("caliber-auth-success", handleCheckView);
    return () => window.removeEventListener("caliber-auth-success", handleCheckView);
  }, [isAuthenticated]);

  async function fetchCandidates() {
    try {
      const res = await fetch(`${API_BASE}/api/candidates`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCandidates(data.candidates || []);
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
      setError("Unable to connect to Caliber AI assessment service. Please verify backend service status.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectCandidate(candidateId: string) {
    if (!isAuthenticated) {
      openAuthModal("LOGIN");
      return;
    }
    const candidate = candidates.find((c) => c.member.id === candidateId);
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

  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      c.member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.member.jobRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.member.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (roleFilter === "ALL") return matchesSearch;
    return matchesSearch && c.member.jobRole.toUpperCase().includes(roleFilter);
  });

  return (
    <main className="flex-1 flex flex-col bg-canvas text-text min-h-screen relative">
      {/* ─── Apple Floating Liquid Glass Navbar ─── */}
      <header className="sticky top-3 z-40 max-w-7xl mx-auto px-4 w-full">
        <div className="rounded-3xl liquid-glass-elevated px-6 h-16 flex items-center justify-between shadow-2xl border border-white/15">
          <div 
            onClick={() => setViewMode("LANDING")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <img 
              src="/logo-icon-clean.png" 
              alt="Caliber AI Logo" 
              className="h-14 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,64,0,0.4)] group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          <div className="flex items-center gap-4">
            {viewMode === "LANDING" && (
              <>
                <nav className="hidden lg:flex items-center gap-6 text-xs text-muted/80 font-medium mr-2">
                  <a href="#features" className="hover:text-text transition-colors">Capabilities</a>
                  <a href="#workflow" className="hover:text-text transition-colors">Evaluation Workflow</a>
                  <a href="#architecture" className="hover:text-text transition-colors">Assessment Engine</a>
                </nav>
                <button
                  onClick={() => {
                    if (isAuthenticated) {
                      setViewMode("CANDIDATES");
                    } else {
                      openAuthModal("LOGIN");
                    }
                  }}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-300 shadow-xl bg-accent text-white hover:bg-accent-hover shadow-accent/25 hover:shadow-accent/40 hover:-translate-y-0.5"
                >
                  Launch Directory →
                </button>
              </>
            )}

            {/* ─── Apple Liquid Auth Section ─── */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl liquid-glass border border-accent/30 hover:border-accent/60 transition-all text-xs font-semibold"
                >
                  <div className="w-7 h-7 rounded-xl bg-accent/20 text-accent font-black flex items-center justify-center text-xs shadow-md">
                    {user?.name.charAt(0)}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-text font-bold leading-none">{user?.name}</p>
                    <p className="text-[9px] text-muted leading-none mt-0.5 font-mono">{user?.role}</p>
                  </div>
                  <svg className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {showUserMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowUserMenu(false)} 
                    />
                    <div className="absolute right-0 top-full mt-3 w-64 rounded-3xl bg-[#0d0f15]/95 backdrop-blur-3xl border border-white/20 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.95)] z-50 animate-fade-in text-xs space-y-2">
                      <div className="px-2 py-2 border-b border-white/15 pb-3">
                        <p className="font-extrabold text-white text-base tracking-tight">{user?.name}</p>
                        <p className="text-xs text-gray-300 font-mono truncate mt-0.5">{user?.email}</p>
                        <span className="inline-flex items-center mt-2 px-3 py-0.5 rounded-full text-[10px] bg-accent/20 text-accent border border-accent/40 font-mono font-bold tracking-wider uppercase">
                          {user?.role}
                        </span>
                      </div>

                      <div className="pt-1 space-y-1">
                        <button
                          onClick={() => { setShowUserMenu(false); setViewMode("CANDIDATES"); }}
                          className="w-full text-left px-3 py-2.5 rounded-2xl hover:bg-white/15 text-gray-200 hover:text-white font-medium flex items-center gap-2.5 transition-colors"
                        >
                          <span className="text-base">📋</span>
                          <span>Candidate Assessments</span>
                        </button>

                        <button
                          onClick={() => { setShowUserMenu(false); logout(); }}
                          className="w-full text-left px-3 py-2.5 rounded-2xl hover:bg-red-500/20 text-red-400 hover:text-red-300 font-bold flex items-center gap-2.5 transition-colors"
                        >
                          <span className="text-base">🚪</span>
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuthModal("LOGIN")}
                  className="px-4 py-2 rounded-2xl liquid-glass-pill text-xs font-semibold text-text hover:text-white"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuthModal("REGISTER")}
                  className="px-4 py-2 rounded-2xl bg-accent/20 text-accent hover:bg-accent hover:text-white text-xs font-bold transition-all border border-accent/30 shadow-lg"
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── MODE 1: PURE LANDING PAGE ─── */}
      {viewMode === "LANDING" && (
        <div className="flex-1 flex flex-col">
          {/* ─── Hero Section ─── */}
          <section className="relative overflow-hidden pt-20 pb-20 px-6 border-b border-white/10">
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
                <button
                  onClick={() => {
                    if (isAuthenticated) {
                      setViewMode("CANDIDATES");
                    } else {
                      openAuthModal("LOGIN");
                    }
                  }}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-accent text-white font-bold text-sm shadow-2xl shadow-accent/30 hover:bg-accent-hover hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <span>Launch Assessment Directory</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>

                {candidates.length > 0 && (
                  <button
                    onClick={() => handleSelectCandidate(candidates[0].member.id)}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl liquid-glass-pill font-semibold text-sm hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 text-text"
                  >
                    <span>Evaluate Candidate: {candidates[0].member.name}</span>
                    <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Metrics Bar — Apple Liquid Cards */}
            <div className="max-w-6xl mx-auto mt-16 grid grid-cols-2 md:grid-cols-4 gap-5 animate-fade-in delay-3 relative z-10">
              <div className="liquid-glass p-6 rounded-3xl text-center hover:-translate-y-1 transition-all duration-300">
                <p className="text-2xl sm:text-3xl font-black text-accent font-sans">Adaptive Probing</p>
                <p className="text-xs text-muted/80 mt-1 font-medium">Dynamic Multi-Turn Logic</p>
              </div>
              <div className="liquid-glass p-6 rounded-3xl text-center hover:-translate-y-1 transition-all duration-300">
                <p className="text-2xl sm:text-3xl font-black text-text font-sans">Intent Analytics</p>
                <p className="text-xs text-muted/80 mt-1 font-medium">Cognitive Pattern Analysis</p>
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

          {/* ─── Features Grid Section ─── */}
          <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-b border-white/10">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-semibold text-accent uppercase tracking-widest">Platform Capabilities</span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-2 text-text">Built for Deep Technical Verification</h2>
              <p className="text-sm text-muted mt-2">
                Designed to move past trivia memory and evaluate real engineering trade-offs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="liquid-glass-elevated p-8 rounded-3xl hover:-translate-y-1.5 transition-all duration-500">
                <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2 text-text">Staff Assessor Persona</h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  Generates scenario-based technical questions probing system trade-offs, architecture limits, and real-world failure modes.
                </p>
              </div>

              <div className="liquid-glass-elevated p-8 rounded-3xl hover:-translate-y-1.5 transition-all duration-500">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M9.75 3.104c.251.023.501.05.75.082" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2 text-text">Intent &amp; Memory Engine</h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  Tracks candidate reasoning trajectories across turns, preventing redundant questions and probing deeper on key insights.
                </p>
              </div>

              <div className="liquid-glass-elevated p-8 rounded-3xl hover:-translate-y-1.5 transition-all duration-500">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2 text-text">Multi-Dimensional Analytics</h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  Evaluates Depth, Accuracy, and Trade-off Awareness to produce objective, boardroom-ready candidate scorecards.
                </p>
              </div>
            </div>
          </section>

          {/* ─── Workflow Section ─── */}
          <section id="workflow" className="max-w-7xl mx-auto px-6 py-20 border-b border-white/10">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-semibold text-accent uppercase tracking-widest">Evaluation Process</span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-2 text-text">How Caliber AI Operates</h2>
              <p className="text-sm text-muted mt-2">From candidate selection to final report synthesis</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="liquid-glass p-8 rounded-3xl relative hover:-translate-y-1 transition-all duration-300">
                <span className="text-4xl font-black text-accent/40 mb-4 block font-mono">01</span>
                <h3 className="text-lg font-bold mb-2 text-text">Select Candidate Profile</h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  Select a graduate or applicant profile to load their background curriculum objectives and skill domain history.
                </p>
              </div>

              <div className="liquid-glass p-8 rounded-3xl relative hover:-translate-y-1 transition-all duration-300">
                <span className="text-4xl font-black text-accent/40 mb-4 block font-mono">02</span>
                <h3 className="text-lg font-bold mb-2 text-text">Adaptive Evaluation Loop</h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  Conduct live adaptive assessment turns. Automatically triggers targeted follow-ups whenever candidate answers lack depth.
                </p>
              </div>

              <div className="liquid-glass p-8 rounded-3xl relative hover:-translate-y-1 transition-all duration-300">
                <span className="text-4xl font-black text-accent/40 mb-4 block font-mono">03</span>
                <h3 className="text-lg font-bold mb-2 text-text">Executive Synthesis</h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  Synthesize overall score (0-100), topic breakdown, candidate strengths, gaps, and recommended next learning steps.
                </p>
              </div>
            </div>

            <div className="mt-14 text-center">
              <button
                onClick={() => {
                  if (isAuthenticated) {
                    setViewMode("CANDIDATES");
                  } else {
                    openAuthModal("LOGIN");
                  }
                }}
                className="px-8 py-4 rounded-2xl bg-accent text-white font-bold text-sm shadow-2xl shadow-accent/30 hover:bg-accent-hover hover:-translate-y-0.5 transition-all duration-300 inline-flex items-center gap-2"
              >
                <span>Launch Candidate Evaluation Now →</span>
              </button>
            </div>
          </section>

          {/* ─── Apple Liquid Footer ─── */}
          <footer className="border-t border-white/10 bg-canvas/30 backdrop-blur-xl pt-16 pb-12 px-6">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <img 
                    src="/logo-icon-clean.png" 
                    alt="Caliber AI" 
                    className="h-8 w-auto object-contain drop-shadow-[0_0_10px_rgba(255,64,0,0.4)]"
                  />
                </div>
                <p className="text-xs text-muted/80 leading-relaxed font-normal">
                  Enterprise-grade AI-powered technical interview engine designed for AI cohort graduates and engineering organizations.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text mb-4">Capabilities</h4>
                <ul className="space-y-2.5 text-xs text-muted/80 font-normal">
                  <li><a href="#features" className="hover:text-text transition-colors">Adaptive Probing Logic</a></li>
                  <li><a href="#features" className="hover:text-text transition-colors">Cognitive Intent Memory</a></li>
                  <li><a href="#features" className="hover:text-text transition-colors">Calibrated Assessment</a></li>
                  <li><a href="#features" className="hover:text-text transition-colors">Real-Time Probing</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text mb-4">Platform</h4>
                <ul className="space-y-2.5 text-xs text-muted/80 font-normal">
                  <li>
                    <button 
                      onClick={() => {
                        if (isAuthenticated) {
                          setViewMode("CANDIDATES");
                        } else {
                          openAuthModal("LOGIN");
                        }
                      }} 
                      className="hover:text-text transition-colors cursor-pointer"
                    >
                      Candidate Directory
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
                  <p className="text-[11px] text-muted/70 leading-relaxed font-normal">
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
        </div>
      )}

      {/* ─── MODE 2: CANDIDATE DIRECTORY VIEW (APPLE LIQUID GLASS) ─── */}
      {viewMode === "CANDIDATES" && (
        <section className="max-w-7xl mx-auto px-6 py-10 flex-1 w-full animate-fade-in relative z-10">
          {/* Top Bar with Back Button and Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-accent mb-2">
                <span>Candidate Directory</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-text">Select Candidate to Begin Assessment</h1>
              <p className="text-sm text-muted mt-1">
                Choose an engineering candidate to launch their personalized technical assessment.
              </p>
            </div>

            {/* Role Filter Glass Tabs */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl liquid-glass text-xs shrink-0">
              {["ALL", "DATA", "ENGINEER", "BACKEND"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRoleFilter(tab)}
                  className={`px-4 py-2 rounded-xl font-bold transition-all duration-300 ${
                    roleFilter === tab
                      ? "bg-accent text-white shadow-lg shadow-accent/25"
                      : "text-muted hover:text-text"
                  }`}
                >
                  {tab === "ALL" ? "All Roles" : tab}
                </button>
              ))}
            </div>
          </div>

          {/* Liquid Search Input */}
          <div className="mb-8 max-w-md">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search candidate name, role, or ID (e.g. CAND-001)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl liquid-glass text-sm text-text
                           placeholder:text-muted/50 focus:outline-none focus:border-accent/40
                           transition-all duration-300 shadow-lg"
              />
            </div>
          </div>

          {/* Candidates Directory Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
                <p className="text-sm text-muted font-medium">Loading candidate directory...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4 max-w-md text-center p-8 rounded-3xl liquid-glass-error">
                <div className="w-12 h-12 rounded-2xl bg-error/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <p className="text-sm text-error font-medium">{error}</p>
                <button
                  onClick={() => { setError(null); setLoading(true); fetchCandidates(); }}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl liquid-glass-pill text-text hover:text-white"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-5">
                <p className="text-xs text-muted font-medium">
                  Showing <strong className="text-text font-bold">{filteredCandidates.length}</strong> candidate{filteredCandidates.length !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-4 text-[11px] text-muted">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success" /> Passed</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-error" /> Failed</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-muted/30" /> Skipped</span>
                </div>
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
                    onSelect={handleSelectCandidate}
                    index={index}
                  />
                ))}
              </div>

              {filteredCandidates.length === 0 && (
                <div className="text-center py-20 rounded-3xl liquid-glass">
                  <p className="text-muted text-sm font-medium">No candidates match your search query &quot;{searchQuery}&quot;.</p>
                  <button
                    onClick={() => { setSearchQuery(""); setRoleFilter("ALL"); }}
                    className="mt-3 px-4 py-2 text-xs text-accent font-semibold hover:underline"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Loading Overlay */}
      {starting && (
        <div className="fixed inset-0 z-50 bg-canvas/60 backdrop-blur-2xl flex items-center justify-center">
          <div className="flex flex-col items-center gap-5 p-8 rounded-3xl liquid-glass-elevated animate-fade-in text-center max-w-sm">
            <div className="w-12 h-12 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
            <div>
              <p className="text-base font-bold text-text">Initializing Technical Assessment...</p>
              <p className="text-xs text-muted/80 mt-1">Preparing adaptive question engine &amp; candidate cognitive profile</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
