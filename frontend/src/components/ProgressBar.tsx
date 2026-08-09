interface ProgressBarProps {
  current: number;
  minimum?: number;
  total?: number;
  label?: string;
}

export default function ProgressBar({
  current,
  minimum = 8,
  total,
  label = "Question",
}: ProgressBarProps) {
  const targetMax = total || minimum;
  const progress = Math.min((current / targetMax) * 100, 100);
  const isComplete = current >= targetMax;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-semibold text-muted whitespace-nowrap">
          {label}
        </span>
      </div>
      <div className="flex-1 h-2 rounded-full bg-border overflow-hidden p-0.5">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out shadow-sm ${
            isComplete ? "bg-success" : "bg-gradient-to-r from-accent/80 to-accent"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs font-mono font-bold text-text">
        {Math.round(progress)}%
      </span>
      {isComplete && (
        <svg
          className="w-4 h-4 text-success shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      )}
    </div>
  );
}
