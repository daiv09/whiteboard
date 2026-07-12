import React from "react";
import { CapturedFrame } from "../../types/whiteboard";
import { CaptureStatus } from "../../hooks/useCapture";

interface SidebarProps {
  showBoundingBox: boolean;
  setShowBoundingBox: (show: boolean) => void;
  showOverlayHints: boolean;
  setShowOverlayHints: (show: boolean) => void;
  autoCapture: boolean;
  setAutoCapture: (capture: boolean) => void;
  captureStatus: CaptureStatus;
  lastCapturedTime: string | null;
  lastCapturedPreview: string | null;
  capturedFrames: CapturedFrame[];
  selectedFrame: CapturedFrame | null;
  setSelectedFrame: (frame: CapturedFrame | null) => void;
}

export function Sidebar({
  showBoundingBox,
  setShowBoundingBox,
  showOverlayHints,
  setShowOverlayHints,
  autoCapture,
  setAutoCapture,
  captureStatus,
  lastCapturedTime,
  lastCapturedPreview,
  capturedFrames,
  selectedFrame,
  setSelectedFrame,
}: SidebarProps) {
  return (
    <div className="w-full lg:w-80 flex flex-col gap-5 shrink-0 select-none">
      {/* Auto Capture Settings */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col gap-4">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-800">
          Pipeline Control
        </h2>

        {/* Toggle bounding box */}
        <div className="flex items-center justify-between text-xs font-medium text-zinc-600">
          <span>Show Bounds Overlay</span>
          <button
            onClick={() => setShowBoundingBox(!showBoundingBox)}
            className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
              showBoundingBox ? "bg-zinc-800" : "bg-zinc-200"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                showBoundingBox ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Toggle Tutor Overlay Hints (Step 2) */}
        <div className="flex items-center justify-between text-xs font-medium text-zinc-600">
          <span>Show Tutor Overlay Hints</span>
          <button
            onClick={() => setShowOverlayHints(!showOverlayHints)}
            className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
              showOverlayHints ? "bg-[#D22630]" : "bg-zinc-200"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                showOverlayHints ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Toggle Capture Loop */}
        <div className="flex items-center justify-between text-xs font-medium text-zinc-600">
          <span>Auto Capture (1 FPS)</span>
          <button
            onClick={() => setAutoCapture(!autoCapture)}
            className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
              autoCapture ? "bg-[#24A148]" : "bg-zinc-200"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                autoCapture ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="w-full h-[1px] bg-zinc-100 my-1" />

        {/* Capture Pipeline Status */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-zinc-500">Pipeline Status</span>
            <span
              className={`font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full ${
                captureStatus === "saved"
                  ? "bg-green-50 text-green-700"
                  : captureStatus === "capturing"
                  ? "bg-blue-50 text-blue-700 animate-pulse"
                  : captureStatus === "no-change"
                  ? "bg-amber-50 text-amber-700"
                  : captureStatus === "empty"
                  ? "bg-zinc-100 text-zinc-500"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {captureStatus === "no-change" ? "No Change (Skipped)" : captureStatus}
            </span>
          </div>
          {lastCapturedTime && (
            <div className="text-[10px] text-zinc-400 font-mono flex justify-between">
              <span>Last Capture Action</span>
              <span>{lastCapturedTime}</span>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Cropped Image Thumbnail Preview (Immediate Verification) */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col gap-3 flex-1 min-h-[220px]">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-800">
          Live Cropped Feed
        </h2>
        <div className="flex-1 w-full bg-zinc-50 border border-zinc-100 rounded-2xl overflow-hidden flex items-center justify-center relative min-h-[140px]">
          {lastCapturedPreview ? (
            <>
              <img
                src={lastCapturedPreview}
                alt="Cropped preview"
                className="max-w-full max-h-full object-contain p-2"
              />
              <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
                20px padding
              </span>
            </>
          ) : (
            <div className="text-center p-4 text-zinc-400 text-xs">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto mb-2 opacity-50"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              Waiting for drawing capture...
            </div>
          )}
        </div>
      </div>

      {/* Sequential Saves List */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col gap-3 max-h-[220px] lg:max-h-[300px]">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-800 flex items-center justify-between">
          <span>Captured Frames</span>
          <span className="text-[10px] font-mono font-normal text-zinc-400">
            {capturedFrames.length} total
          </span>
        </h2>
        <div className="flex flex-col gap-2 overflow-y-auto pr-1 flex-1">
          {capturedFrames.length === 0 ? (
            <div className="text-center py-6 text-zinc-400 text-xs font-medium">
              No saved frames yet
            </div>
          ) : (
            capturedFrames.map((f, i) => (
              <div
                key={`${f.name}-${i}`}
                onClick={() => f.tutorFeedback && setSelectedFrame(f)}
                className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-all ${
                  f.tutorFeedback ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                } ${
                  selectedFrame?.name === f.name
                    ? "bg-zinc-800 border-zinc-800 text-white"
                    : "bg-zinc-50 border-zinc-100 text-zinc-800 hover:bg-zinc-100"
                }`}
              >
                <div className="flex flex-col">
                  <span className={`font-mono text-[10px] truncate max-w-[130px] ${
                    selectedFrame?.name === f.name ? "text-white" : "text-zinc-800"
                  }`} title={f.name}>
                    {f.name}
                  </span>
                  <span className={`text-[9px] ${
                    selectedFrame?.name === f.name ? "text-zinc-300" : "text-zinc-400"
                  }`}>{f.time}</span>
                </div>
                {f.success && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-green-500/20 text-green-600">
                    {f.size}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
