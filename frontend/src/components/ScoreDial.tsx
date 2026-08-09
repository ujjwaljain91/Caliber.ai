"use client";

import { useEffect, useState } from "react";

interface ScoreDialProps {
  score: number; // 0–100
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export default function ScoreDial({
  score,
  size = 200,
  strokeWidth = 10,
  label = "Overall Assessment",
}: ScoreDialProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 200);
    return () => clearTimeout(timer);
  }, [score]);

  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (animatedScore / 100) * circumference;

  // Refracted liquid colors based on score
  const getColor = () => {
    if (animatedScore >= 80) return "#22c55e";
    if (animatedScore >= 60) return "#f59e0b";
    if (animatedScore >= 40) return "#f97316";
    return "#ef4444";
  };

  const getGradientId = () => {
    if (animatedScore >= 80) return "grad-success";
    if (animatedScore >= 60) return "grad-warning";
    return "grad-error";
  };

  const getGrade = () => {
    if (score >= 90) return "A+";
    if (score >= 80) return "A";
    if (score >= 70) return "B+";
    if (score >= 60) return "B";
    if (score >= 50) return "C";
    return "D";
  };

  return (
    <div className="flex flex-col items-center gap-4 relative">
      {/* Ambient background glow orb */}
      <div 
        className="absolute inset-0 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-1000"
        style={{
          background: `radial-gradient(circle, ${getColor()} 0%, transparent 70%)`,
          transform: "scale(1.4)",
        }}
      />

      {/* Frosted Glass Ring Outer Container */}
      <div 
        className="relative flex items-center justify-center rounded-full p-4 liquid-glass-elevated"
        style={{ width: size + 20, height: size + 20 }}
      >
        <svg
          className="transform -rotate-90 overflow-visible"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          <defs>
            <linearGradient id="grad-success" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
            <linearGradient id="grad-warning" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="grad-error" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>

          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth={strokeWidth}
          />

          {/* Glowing progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${getGradientId()})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            className="transition-all duration-[1600ms] cubic-bezier(0.16, 1, 0.3, 1)"
            style={{
              filter: `drop-shadow(0 0 12px ${getColor()}80)`,
            }}
          />
        </svg>

        {/* Center score typography */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className="text-5xl font-extralight tracking-tight font-sans text-text transition-all duration-700"
          >
            {Math.round(animatedScore)}
          </span>
          <span 
            className="mt-1 px-3 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-md border border-white/10"
            style={{ 
              backgroundColor: `${getColor()}18`,
              color: getColor(),
              borderColor: `${getColor()}30`,
            }}
          >
            Grade {getGrade()}
          </span>
        </div>
      </div>

      <span className="text-xs font-medium text-muted/70 tracking-widest uppercase">
        {label}
      </span>
    </div>
  );
}
