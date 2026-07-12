import React from "react";
import { CapturedFrame, TutorFeedback } from "../../types/whiteboard";

interface OverlayPosition {
  left: number;
  top: number;
  arrowDir: string;
  arrowStyle?: React.CSSProperties;
}

interface OverlayHintProps {
  showOverlayHints: boolean;
  tutorFeedback: TutorFeedback | null;
  selectedFrame: CapturedFrame | null;
  getOverlayPosition: () => OverlayPosition | null;
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number } | null;
}

export function OverlayHint({
  showOverlayHints,
  tutorFeedback,
  selectedFrame,
  getOverlayPosition,
  boundingBox
}: OverlayHintProps) {
  if (!showOverlayHints) return null;

  const activeFeedback = selectedFrame?.tutorFeedback || tutorFeedback;
  if (!activeFeedback || activeFeedback.no_algorithm) return null;
  
  const pos = getOverlayPosition();
  if (!pos) {
    console.warn("[CS Tutor Overlay] Warning: getOverlayPosition() returned null. Bounding box:", boundingBox);
    return null;
  }

  return (
    <div
      className="absolute z-30 w-[240px] bg-red-50/95 backdrop-blur-sm border border-[#D22630]/20 rounded-2xl p-3.5 shadow-md transition-all duration-300 select-text animate-fade-in pointer-events-none"
      style={{
        left: `${pos.left}px`,
        top: `${pos.top}px`,
        zIndex: 1000,
      }}
    >
      {/* Arrow element */}
      {pos.arrowDir !== "none" && pos.arrowStyle && (
        <div
          className="absolute w-3.5 h-3.5 bg-red-50/95 transform rotate-45"
          style={pos.arrowStyle}
        />
      )}
      
      {/* Header Title */}
      <div className="text-[9px] uppercase font-bold text-red-500/60 font-sans tracking-wider mb-1 flex items-center gap-1 select-none">
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        CS Tutor Annotation
      </div>
      
      {/* Text Suggestion (Handwritten Style) */}
      <p
        className="text-lg text-[#D22630] leading-snug font-medium select-text"
        style={{ fontFamily: "var(--font-caveat), cursive" }}
      >
        {activeFeedback.tutor_hint}
      </p>
    </div>
  );
}
