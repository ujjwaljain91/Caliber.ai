"use client";

interface Mission {
  day: number;
  title: string;
  passed?: boolean | null;
  skipped?: boolean | null;
  attempts?: number | null;
}

interface CandidateCardProps {
  id: string;
  name: string;
  jobRole: string;
  yearsExperience: number;
  education: string;
  missions: Mission[];
  signals: {
    commitDays: number;
    missionsCompleted: number;
    missionsFirstTry: number;
  };
  onSelect: (id: string) => void;
  index: number;
}

export default function CandidateCard({
  id,
  name,
  jobRole,
  yearsExperience,
  education,
  missions,
  signals,
  onSelect,
  index,
}: CandidateCardProps) {
  const passedCount = missions.filter((m) => m.passed).length;
  const skippedCount = missions.filter((m) => m.skipped).length;
  const failedCount = missions.filter(
    (m) => m.passed === false && !m.skipped
  ).length;

  const completionRate = Math.round(
    (signals.missionsCompleted / 31) * 100
  );

  return (
    <div
      className="group relative flex flex-col justify-between p-6 rounded-3xl liquid-glass
                 hover:liquid-glass-elevated transition-all duration-500 cursor-pointer
                 animate-fade-in-up opacity-0 hover:-translate-y-1.5 overflow-hidden"
      style={{ animationDelay: `${index * 0.05}s`, animationFillMode: "forwards" }}
      onClick={() => onSelect(id)}
    >
      {/* Subtle Refraction Glow on Hover */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      {/* Header */}
      <div>
        <div className="flex items-start justify-between relative mb-1">
          <div className="min-w-0 pr-2">
            <h3 className="text-base font-bold text-text group-hover:text-white transition-colors truncate">
              {name}
            </h3>
            <p className="text-xs text-muted/90 font-medium mt-0.5">{jobRole}</p>
          </div>
          <span className="text-[10px] font-mono text-muted/80 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/10 shrink-0">
            {id}
          </span>
        </div>

        {/* Details */}
        <div className="flex items-center gap-4 text-xs text-muted/70 my-3 font-normal">
          <span className="flex items-center gap-1.5 truncate">
            <svg className="w-3.5 h-3.5 text-accent/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
            </svg>
            <span className="truncate">{education}</span>
          </span>
          <span className="flex items-center gap-1.5 shrink-0">
            <svg className="w-3.5 h-3.5 text-accent/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            {yearsExperience}y exp
          </span>
        </div>

        {/* Liquid Mission Badges */}
        <div className="flex flex-wrap gap-1.5 my-3 relative">
          {missions.map((m) => (
            <div
              key={m.day}
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-mono font-bold transition-all duration-200 group-hover:scale-105 ${
                m.skipped
                  ? "bg-white/[0.03] text-muted/40 border border-white/5"
                  : m.passed
                  ? m.attempts && m.attempts <= 1
                    ? "bg-success/20 text-success border border-success/30 shadow-[0_0_8px_rgba(34,197,94,0.2)]"
                    : "bg-success/10 text-success/80 border border-success/20"
                  : m.passed === false
                  ? "bg-error/20 text-error border border-error/30"
                  : "bg-white/[0.03] text-muted/40 border border-white/5"
              }`}
              title={`Day ${m.day}: ${m.title}${m.attempts ? ` (${m.attempts} attempts)` : ""}${m.skipped ? " (Skipped)" : ""}`}
            >
              {m.day}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Stats & Glass Action Button */}
      <div className="pt-4 border-t border-white/10 flex items-center justify-between relative mt-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span className="text-xs text-muted/80 font-mono">{passedCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-muted/30" />
            <span className="text-xs text-muted/80 font-mono">{skippedCount}</span>
          </div>
          {failedCount > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-error" />
              <span className="text-xs text-muted/80 font-mono">{failedCount}</span>
            </div>
          )}
        </div>

        {/* Completion Bar */}
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full bg-black/40 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent/80 to-accent transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-muted">{completionRate}%</span>
        </div>
      </div>

      {/* Floating Action Badge (visible on hover) */}
      <div className="absolute inset-x-4 bottom-4 pt-3 flex justify-end pointer-events-none">
        <button
          className="pointer-events-auto px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold
                     opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0
                     transition-all duration-300 hover:bg-accent-hover shadow-xl shadow-accent/25"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(id);
          }}
        >
          Start Assessment →
        </button>
      </div>
    </div>
  );
}
