"use client";

interface MasteryCardProps {
  day: number;
  title: string;
  status: "Passed" | "Needs Review" | "Failed";
  score: number;
  questionCount: number;
  keyInsight: string;
}

export default function MasteryCard({
  day,
  title,
  status,
  score,
  questionCount,
  keyInsight,
}: MasteryCardProps) {
  const statusStyles = {
    Passed: {
      glassClass: "liquid-glass-success",
      badge: "bg-success/15 text-success border-success/25",
      dot: "bg-success",
      bar: "bg-gradient-to-r from-emerald-400 to-green-500",
    },
    "Needs Review": {
      glassClass: "liquid-glass-warning",
      badge: "bg-warning/15 text-warning border-warning/25",
      dot: "bg-warning",
      bar: "bg-gradient-to-r from-amber-400 to-yellow-500",
    },
    Failed: {
      glassClass: "liquid-glass-error",
      badge: "bg-error/15 text-error border-error/25",
      dot: "bg-error",
      bar: "bg-gradient-to-r from-rose-400 to-red-500",
    },
  };

  const style = statusStyles[status];

  return (
    <div
      className={`group relative flex flex-col justify-between p-5 rounded-2xl ${style.glassClass} transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl overflow-hidden`}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-muted/80 tracking-wider uppercase">
            Day {day}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${style.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            {status}
          </span>
        </div>

        <h4 className="text-sm font-semibold text-text group-hover:text-white transition-colors line-clamp-1">
          {title}
        </h4>
      </div>

      {/* Center Insight */}
      <p className="text-xs text-text-secondary/80 leading-relaxed my-4 line-clamp-3 font-normal">
        {keyInsight}
      </p>

      {/* Bottom Score Bar & Footer */}
      <div className="pt-3 border-t border-white/5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] text-muted">Mastery Score</span>
          <span className="font-mono font-bold text-text">{score.toFixed(1)} <span className="text-muted/60 text-[10px]">/ 10</span></span>
        </div>

        <div className="h-1.5 rounded-full bg-black/40 overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${style.bar}`}
            style={{ width: `${Math.min((score / 10) * 100, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted/60 pt-1">
          <span>{questionCount} question{questionCount !== 1 ? "s" : ""} evaluated</span>
          <span className="group-hover:translate-x-0.5 transition-transform">Details →</span>
        </div>
      </div>
    </div>
  );
}
