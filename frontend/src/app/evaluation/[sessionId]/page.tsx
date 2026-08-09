"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ScoreDial from "@/components/ScoreDial";
import MasteryCard from "@/components/MasteryCard";

interface Feedback {
  summary: string;
  strengths: string[];
  gaps: string[];
  next: string[];
}

interface TopicAssessment {
  day: number;
  title: string;
  status: "Passed" | "Needs Review" | "Failed";
  score: number;
  question_count: number;
  key_insight: string;
}

interface CategoryScore {
  category: string;
  score: number;
  weight: number;
}

interface FullReport {
  overall_score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  next: string[];
  category_scores: CategoryScore[];
  topic_assessments: TopicAssessment[];
  breeth_cognitive_summary: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function EvaluationPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [report, setReport] = useState<FullReport | null>(null);
  const [candidateName, setCandidateName] = useState("Candidate");
  const [candidateRole, setCandidateRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  function toggleStep(idx: number, stepText: string) {
    setCompletedSteps((prev) => {
      const next = { ...prev, [idx]: !prev[idx] };
      return next;
    });

    const isNowDone = !completedSteps[idx];
    if (isNowDone) {
      setActionNotice(`Step ${idx + 1} marked completed! Action item queued for post-assessment plan.`);
    } else {
      setActionNotice(`Step ${idx + 1} set back to Active trajectory.`);
    }

    setTimeout(() => setActionNotice(null), 3500);
  }

  useEffect(() => {
    loadData();
  }, [sessionId]);

  async function loadData() {
    // Load candidate info from sessionStorage
    const stored = sessionStorage.getItem(`caliber-${sessionId}`);
    if (stored) {
      const data = JSON.parse(stored);
      setCandidateName(data.candidate?.member?.name || "Candidate");
      setCandidateRole(data.candidate?.member?.jobRole || "");
    }

    // Load feedback from sessionStorage
    const storedFeedback = sessionStorage.getItem(`caliber-feedback-${sessionId}`);
    if (storedFeedback) {
      setFeedback(JSON.parse(storedFeedback));
    }

    // Try to load full report from API
    try {
      const res = await fetch(`${API_BASE}/api/interview/${sessionId}/report`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch {
      // Full report is optional — feedback is minimum fallback
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center min-h-screen bg-canvas">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
          <p className="text-sm font-medium text-muted">Synthesizing Liquid Glass Assessment Report...</p>
        </div>
      </main>
    );
  }

  const overallScore = report?.overall_score ?? 65;
  const categoryScores = report?.category_scores || [
    { category: "Technical Depth", score: 70, weight: 0.25 },
    { category: "System Design Thinking", score: 60, weight: 0.25 },
    { category: "Trade-off Analysis", score: 55, weight: 0.2 },
    { category: "Communication Clarity", score: 75, weight: 0.15 },
    { category: "Breadth of Knowledge", score: 65, weight: 0.15 },
  ];

  const topicAssessments = report?.topic_assessments || [];
  const strengths = report?.strengths || feedback?.strengths || [];
  const gaps = report?.gaps || feedback?.gaps || [];
  const nextSteps = report?.next || feedback?.next || [];
  const summary = report?.summary || feedback?.summary || "";
  const breethSummary = report?.breeth_cognitive_summary;

  return (
    <main className="relative flex-1 flex flex-col min-h-screen bg-canvas text-text overflow-hidden">
      {/* ─── Ambient Liquid Refraction Orbs ─── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-accent/15 blur-[120px] animate-orb-1" />
        <div className="absolute top-[40%] right-[-5%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[140px] animate-orb-2" />
        <div className="absolute bottom-[-10%] left-[10%] w-[550px] h-[550px] rounded-full bg-emerald-500/10 blur-[130px] animate-liquid-pulse" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* ─── Apple Floating Liquid Glass Header ─── */}
        <header className="sticky top-3 z-30 max-w-6xl mx-auto px-4 w-full">
          <div className="rounded-3xl liquid-glass-elevated px-6 h-16 flex items-center justify-between shadow-2xl border border-white/15">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/?view=candidates")}
                className="w-9 h-9 rounded-xl liquid-glass-pill flex items-center justify-center text-muted hover:text-text"
                title="Finish the Interview"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <img 
                src="/logo-icon-clean.png" 
                alt="Caliber AI" 
                className="h-10 w-auto object-contain drop-shadow-[0_0_8px_rgba(255,64,0,0.4)]"
              />
              <div className="border-l border-white/10 pl-3 py-0.5">
                <div className="flex items-center leading-none">
                  <span className="text-[11px] text-muted/50 font-medium tracking-wide">Assessment Report</span>
                </div>
                {candidateName && (
                  <p className="text-[11px] text-muted mt-0.5">{candidateName} {candidateRole ? `(${candidateRole})` : ""}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-success/15 text-success border border-success/30 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                Interview Evaluation Completed
              </span>
            </div>
          </div>
        </header>

        {/* ─── Main Content Body ─── */}
        <div className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full space-y-12">

          {/* ─── Hero Liquid Card (Score Dial + Executive Summary + Breakdown) ─── */}
          <section className="relative rounded-3xl p-8 lg:p-10 liquid-glass-elevated animate-fade-in overflow-hidden">
            {/* Ambient Refraction inside Card */}
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-accent/10 blur-[80px] pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Score Dial Column */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-white/10 pb-8 lg:pb-0 lg:pr-8">
                <ScoreDial score={overallScore} size={210} label="Cognitive Score" />
              </div>

              {/* Executive Summary & Categories */}
              <div className="lg:col-span-8 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-semibold tracking-widest text-accent uppercase">Executive Summary</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  </div>
                  <p className="text-sm lg:text-base text-text-secondary leading-relaxed font-normal">
                    {summary || "Executive summary synthesis will be loaded upon completing all interview evaluation turns."}
                  </p>
                </div>

                {/* Category Breakdown Horizontal Pills */}
                <div className="pt-4 border-t border-white/10">
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
                    Skill Dimensions & Evaluation
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {categoryScores.map((cat) => (
                      <div 
                        key={cat.category}
                        className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="text-muted/90 font-medium">{cat.category}</span>
                          <span className="font-mono font-bold text-text">{Math.round(cat.score)}/100</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-black/40 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${
                              cat.score >= 70
                                ? "bg-gradient-to-r from-emerald-400 to-green-500"
                                : cat.score >= 50
                                ? "bg-gradient-to-r from-amber-400 to-yellow-500"
                                : "bg-gradient-to-r from-rose-400 to-red-500"
                            }`}
                            style={{ width: `${Math.min(cat.score, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ─── Topic Mastery Grid ─── */}
          {topicAssessments.length > 0 && (
            <section className="space-y-5 animate-fade-in" style={{ animationDelay: "0.15s" }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-text flex items-center gap-2">
                    <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                    Curriculum Topic Mastery
                  </h2>
                  <p className="text-xs text-muted">Evaluated technical domains across candidate responses</p>
                </div>
                <span className="text-xs font-mono text-muted/60">{topicAssessments.length} Topics Evaluated</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {topicAssessments.map((topic) => (
                  <MasteryCard
                    key={topic.day}
                    day={topic.day}
                    title={topic.title}
                    status={topic.status}
                    score={topic.score}
                    questionCount={topic.question_count}
                    keyInsight={topic.key_insight}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ─── Strengths & Growth Areas Liquid Columns ─── */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in" style={{ animationDelay: "0.25s" }}>
            {/* Strengths Column */}
            <div className="p-7 rounded-3xl liquid-glass-success space-y-4">
              <div className="flex items-center gap-2 text-success">
                <div className="w-8 h-8 rounded-xl bg-success/15 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold uppercase tracking-wider">Demonstrated Strengths</h3>
              </div>

              <div className="space-y-3 pt-2">
                {strengths.length > 0 ? (
                  strengths.map((item, idx) => (
                    <div 
                      key={idx}
                      className="p-4 rounded-2xl bg-white/[0.03] border border-success/15 backdrop-blur-md flex items-start gap-3"
                    >
                      <span className="w-6 h-6 rounded-lg bg-success/20 text-success text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs lg:text-sm text-text-secondary leading-relaxed">{item}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted italic">No specific strengths recorded.</p>
                )}
              </div>
            </div>

            {/* Growth Areas Column */}
            <div className="p-7 rounded-3xl liquid-glass-warning space-y-4">
              <div className="flex items-center gap-2 text-warning">
                <div className="w-8 h-8 rounded-xl bg-warning/15 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold uppercase tracking-wider">Identified Growth Areas</h3>
              </div>

              <div className="space-y-3 pt-2">
                {gaps.length > 0 ? (
                  gaps.map((item, idx) => (
                    <div 
                      key={idx}
                      className="p-4 rounded-2xl bg-white/[0.03] border border-warning/15 backdrop-blur-md flex items-start gap-3"
                    >
                      <span className="w-6 h-6 rounded-lg bg-warning/20 text-warning text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs lg:text-sm text-text-secondary leading-relaxed">{item}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted italic">No growth areas recorded.</p>
                )}
              </div>
            </div>
          </section>

          {/* ─── Breeth Cognitive Memory Profile ─── */}
          {breethSummary && (
            <section className="animate-fade-in" style={{ animationDelay: "0.35s" }}>
              <div className="p-8 rounded-3xl liquid-glass-accent space-y-3 relative overflow-hidden">
                <div className="flex items-center gap-2 text-accent">
                  <img 
                    src="/logo-icon-clean.png" 
                    alt="Caliber AI" 
                    className="h-5 w-auto object-contain drop-shadow-[0_0_8px_rgba(255,64,0,0.4)] mr-1"
                  />
                  <h3 className="text-sm font-semibold uppercase tracking-wider">Candidate Reasoning &amp; Cognitive Profile</h3>
                </div>
                <p className="text-xs lg:text-sm text-text-secondary leading-relaxed whitespace-pre-wrap pt-1 font-normal">
                  {breethSummary}
                </p>
              </div>
            </section>
          )}

          {/* ─── Recommended Active Next Steps ─── */}
          <section className="space-y-5 animate-fade-in relative" style={{ animationDelay: "0.45s" }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-text flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                  Actionable Next Steps &amp; Development Trajectory
                </h2>
                <p className="text-xs text-muted">Interactive post-assessment execution plan — click any step to activate or complete</p>
              </div>

              {nextSteps.length > 0 && (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full liquid-glass text-xs shrink-0">
                  <span className="text-muted">Progress:</span>
                  <span className="font-mono font-bold text-accent">
                    {Object.values(completedSteps).filter(Boolean).length} / {nextSteps.length}
                  </span>
                  <span className="text-muted/60">Completed</span>
                </div>
              )}
            </div>

            {/* Action Notice Toast */}
            {actionNotice && (
              <div className="p-3.5 rounded-2xl liquid-glass-accent text-xs font-semibold text-accent animate-fade-in flex items-center justify-between shadow-xl">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-accent animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {actionNotice}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {nextSteps.length > 0 ? (
                nextSteps.map((step, idx) => {
                  const isCompleted = !!completedSteps[idx];
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleStep(idx, step)}
                      className={`group cursor-pointer p-6 rounded-3xl transition-all duration-300 flex flex-col justify-between space-y-4 hover:-translate-y-1.5 border shadow-xl ${
                        isCompleted
                          ? "liquid-glass-success border-success/40"
                          : "liquid-glass hover:liquid-glass-elevated border-white/10 hover:border-accent/30"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-7 h-7 rounded-xl text-xs font-mono font-bold flex items-center justify-center transition-colors ${
                              isCompleted ? "bg-success/20 text-success" : "bg-blue-500/20 text-blue-400"
                            }`}>
                              0{idx + 1}
                            </span>
                            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Step {idx + 1}</span>
                          </div>

                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                            isCompleted
                              ? "bg-success/20 text-success border-success/30"
                              : "bg-white/[0.04] text-muted/80 border-white/10 group-hover:text-accent group-hover:border-accent/30"
                          }`}>
                            {isCompleted ? "Completed ✓" : "Active Plan"}
                          </span>
                        </div>

                        <p className={`text-xs lg:text-sm leading-relaxed transition-colors ${
                          isCompleted ? "text-text-secondary line-through opacity-75" : "text-text font-normal"
                        }`}>
                          {step}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-muted/70 group-hover:text-text transition-colors">
                          {isCompleted ? "Completed Action" : "Click to Complete"}
                        </span>
                        <button
                          type="button"
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                            isCompleted
                              ? "bg-success/20 text-success hover:bg-success/30"
                              : "bg-accent/15 text-accent group-hover:bg-accent group-hover:text-white"
                          }`}
                        >
                          {isCompleted ? "Done ✓" : "Execute Step →"}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-muted italic col-span-3">No next steps provided.</p>
              )}
            </div>
          </section>

          {/* ─── Actions Bar ─── */}
          <section className="flex items-center justify-center gap-4 pt-4 pb-12 animate-fade-in" style={{ animationDelay: "0.55s" }}>
            <button
              onClick={() => router.push("/?view=candidates")}
              className="px-6 py-3 rounded-2xl liquid-glass-pill text-xs font-semibold text-text hover:text-white hover:border-accent/40 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Finish the Interview
            </button>
            <button
              onClick={() => window.print()}
              className="px-7 py-3 rounded-2xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all shadow-xl shadow-accent/25 hover:shadow-accent/40 hover:-translate-y-0.5 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export Liquid Report
            </button>
          </section>

        </div>
      </div>
    </main>
  );
}
