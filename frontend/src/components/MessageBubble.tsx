"use client";

interface MessageBubbleProps {
  content: string;
  role: "interviewer" | "candidate";
  isStreaming?: boolean;
  topicDay?: number;
  topicTitle?: string;
}

export default function MessageBubble({
  content,
  role,
  isStreaming = false,
  topicDay,
  topicTitle,
}: MessageBubbleProps) {
  const isInterviewer = role === "interviewer";

  if (isInterviewer) {
    return (
      <div className="animate-fade-in">
        {/* Topic label — subtle inline glass badge */}
        {topicDay && topicTitle && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-semibold text-accent tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 backdrop-blur-md">
              Day {topicDay}
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="text-[11px] text-muted/70 truncate">
              {topicTitle}
            </span>
          </div>
        )}

        {/* AI response — clean text with official Caliber AI emblem */}
        <div className="flex gap-3 items-start">
          <img
            src="/logo-icon-clean.png"
            alt="Caliber AI"
            className="h-6 w-auto object-contain shrink-0 mt-0.5 drop-shadow-[0_0_6px_rgba(255,64,0,0.3)]"
          />
          <div className="flex-1 min-w-0">
            <p
              className={`text-[15px] leading-[1.75] text-text-secondary whitespace-pre-wrap ${
                isStreaming && !content ? "animate-shimmer-text" : ""
              }`}
            >
              {content || (isStreaming ? "Synthesizing question..." : "")}
            </p>
            {isStreaming && content && (
              <span className="inline-block w-[2px] h-[18px] bg-accent/80 ml-0.5 -mb-[3px] animate-cursor-blink" />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Candidate message — right-aligned liquid glass bubble
  return (
    <div className="animate-fade-in flex justify-end">
      <div className="max-w-[85%] sm:max-w-[70%]">
        <div className="liquid-glass rounded-3xl rounded-tr-lg px-5 py-3.5 shadow-xl">
          <p className="text-[15px] leading-[1.75] text-text whitespace-pre-wrap">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}
