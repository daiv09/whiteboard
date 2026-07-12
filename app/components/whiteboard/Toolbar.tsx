import React from "react";
import { Stroke } from "../../types/whiteboard";

interface ToolbarProps {
  currentColor: string;
  setCurrentColor: (color: string) => void;
  currentWidth: number;
  setCurrentWidth: (width: number) => void;
  undo: () => void;
  redo: () => void;
  clearCanvas: () => void;
  strokes: Stroke[];
  redoStack: Stroke[];
}

export function Toolbar({
  currentColor,
  setCurrentColor,
  currentWidth,
  setCurrentWidth,
  undo,
  redo,
  clearCanvas,
  strokes,
  redoStack,
}: ToolbarProps) {
  const colors = [
    { color: "#1D1D1F", name: "Apple Ink" },
    { color: "#0066CC", name: "Sapphire" },
    { color: "#D22630", name: "Ruby" },
    { color: "#24A148", name: "Emerald" },
  ];

  const widths = [2, 4, 8, 16];

  return (
    <div className="flex justify-center mt-4">
      <div className="flex flex-wrap items-center justify-center gap-5 bg-white/80 backdrop-blur-lg px-6 py-3.5 rounded-2xl border border-zinc-200/90 shadow-[0_8px_32px_rgba(0,0,0,0.06)] max-w-full">
        {/* Drawing Colors */}
        <div className="flex items-center gap-2">
          {colors.map((c) => (
            <button
              key={c.color}
              onClick={() => setCurrentColor(c.color)}
              className={`w-6 h-6 rounded-full border transition-all ${
                currentColor === c.color
                  ? "ring-2 ring-zinc-800 ring-offset-2 scale-110"
                  : "border-zinc-200 hover:scale-105"
              }`}
              style={{ backgroundColor: c.color }}
              title={c.name}
            />
          ))}
        </div>

        <div className="w-[1px] h-6 bg-zinc-200" />

        {/* Brush Sizes */}
        <div className="flex items-center gap-1.5">
          {widths.map((w) => (
            <button
              key={w}
              onClick={() => setCurrentWidth(w)}
              className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all ${
                currentWidth === w
                  ? "bg-zinc-800 text-white"
                  : "hover:bg-zinc-100 text-zinc-600"
              }`}
            >
              {w}px
            </button>
          ))}
        </div>

        <div className="w-[1px] h-6 bg-zinc-200" />

        {/* Utilities */}
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={strokes.length === 0}
            className="p-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent"
            title="Undo (Ctrl+Z)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </button>

          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className="p-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent"
            title="Redo"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 7v6h-6" />
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
            </svg>
          </button>

          <button
            onClick={clearCanvas}
            disabled={strokes.length === 0}
            className="p-1.5 rounded-lg text-zinc-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-600"
            title="Clear All"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
