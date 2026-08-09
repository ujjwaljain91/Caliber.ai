interface TopicBadgeProps {
  day: number;
  title: string;
  status?: "active" | "completed" | "upcoming" | "skipped" | "failed";
  compact?: boolean;
}

export default function TopicBadge({
  day,
  title,
  status = "upcoming",
  compact = false,
}: TopicBadgeProps) {
  const statusStyles = {
    active:
      "bg-accent-soft border-accent/30 text-accent shadow-[0_0_12px_rgba(255,64,0,0.15)]",
    completed: "bg-success-soft border-success/30 text-success",
    upcoming: "bg-container border-border text-muted",
    skipped: "bg-container border-border text-muted/50 line-through",
    failed: "bg-error-soft border-error/30 text-error",
  };

  const dotColors = {
    active: "bg-accent animate-pulse",
    completed: "bg-success",
    upcoming: "bg-muted/40",
    skipped: "bg-muted/20",
    failed: "bg-error",
  };

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-300 ${statusStyles[status]}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[status]}`} />
        Day {day}
      </span>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300 ${statusStyles[status]}`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColors[status]}`} />
      <div className="min-w-0">
        <span className="text-xs text-muted font-medium">Day {day}</span>
        <p className="text-sm font-medium truncate">{title}</p>
      </div>
    </div>
  );
}
