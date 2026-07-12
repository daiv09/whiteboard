"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

interface TutorFeedback {
  code: string;
  logic_intent: string;
  missing_edge_cases: string[];
  tutor_hint: string;
  no_algorithm?: boolean;
}

interface CapturedFrame {
  name: string;
  time: string;
  size: string;
  success: boolean;
  tutorFeedback?: TutorFeedback;
}

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drawing state
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Brush settings
  const [currentColor, setCurrentColor] = useState("#1D1D1F"); // Apple Slate
  const [currentWidth, setCurrentWidth] = useState(4);

  // UI preferences
  const [showBoundingBox, setShowBoundingBox] = useState(false);
  const [autoCapture, setAutoCapture] = useState(true);
  const [showOverlayHints, setShowOverlayHints] = useState(true);
  
  // Capture states
  const [captureStatus, setCaptureStatus] = useState<
    "idle" | "capturing" | "saved" | "no-change" | "error" | "empty"
  >("empty");
  const [lastCapturedPreview, setLastCapturedPreview] = useState<string | null>(null);
  const [capturedFrames, setCapturedFrames] = useState<CapturedFrame[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [lastCapturedTime, setLastCapturedTime] = useState<string | null>(null);
  const [tutorFeedback, setTutorFeedback] = useState<TutorFeedback | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<CapturedFrame | null>(null);

  // Keep track of last captured strokes to avoid redundant uploads (Change Detection)
  const lastCapturedStrokesRef = useRef<string>("");

  // Resize handler to fit container
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setCanvasSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    
    // Tiny delay to ensure layout is computed
    const timer = setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, []);

  // Compute bounding box of active strokes + current drawing stroke
  const boundingBox = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let hasPoints = false;

    const updateBounds = (points: Point[]) => {
      points.forEach((p) => {
        hasPoints = true;
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      });
    };

    strokes.forEach((stroke) => updateBounds(stroke.points));
    if (currentStroke.length > 0) {
      updateBounds(currentStroke);
    }

    if (!hasPoints) return null;

    return { minX, minY, maxX, maxY };
  }, [strokes, currentStroke]);

  // Position calculation engine for tutor overlay (Step 2)
  const getOverlayPosition = () => {
    if (!boundingBox || !canvasSize.width) return null;
    const { minX, minY, maxX, maxY } = boundingBox;
    const boxWidth = 240;
    const boxHeight = 120;
    const padding = 30;

    // Try 1: Right side
    if (maxX + boxWidth + padding < canvasSize.width) {
      return {
        left: maxX + padding,
        top: Math.max(20, minY + (maxY - minY) / 2 - boxHeight / 2),
        arrowDir: "left",
        arrowStyle: {
          left: "-7px",
          top: "50%",
          transform: "translateY(-50%) rotate(45deg)",
          borderLeft: "1px solid rgba(210, 38, 48, 0.15)",
          borderBottom: "1px solid rgba(210, 38, 48, 0.15)",
        }
      };
    }

    // Try 2: Left side
    if (minX - boxWidth - padding > 0) {
      return {
        left: minX - boxWidth - padding,
        top: Math.max(20, minY + (maxY - minY) / 2 - boxHeight / 2),
        arrowDir: "right",
        arrowStyle: {
          right: "-7px",
          top: "50%",
          transform: "translateY(-50%) rotate(45deg)",
          borderRight: "1px solid rgba(210, 38, 48, 0.15)",
          borderTop: "1px solid rgba(210, 38, 48, 0.15)",
        }
      };
    }

    // Try 3: Bottom side
    if (maxY + boxHeight + padding < canvasSize.height) {
      return {
        left: Math.max(20, Math.min(canvasSize.width - boxWidth - 20, minX + (maxX - minX) / 2 - boxWidth / 2)),
        top: maxY + padding,
        arrowDir: "up",
        arrowStyle: {
          top: "-7px",
          left: "50%",
          transform: "translateX(-50%) rotate(45deg)",
          borderTop: "1px solid rgba(210, 38, 48, 0.15)",
          borderLeft: "1px solid rgba(210, 38, 48, 0.15)",
        }
      };
    }

    // Try 4: Top side
    if (minY - boxHeight - padding > 0) {
      return {
        left: Math.max(20, Math.min(canvasSize.width - boxWidth - 20, minX + (maxX - minX) / 2 - boxWidth / 2)),
        top: minY - boxHeight - padding,
        arrowDir: "down",
        arrowStyle: {
          bottom: "-7px",
          left: "50%",
          transform: "translateX(-50%) rotate(45deg)",
          borderBottom: "1px solid rgba(210, 38, 48, 0.15)",
          borderRight: "1px solid rgba(210, 38, 48, 0.15)",
        }
      };
    }

    // Default Fallback
    return {
      left: Math.max(20, Math.min(canvasSize.width - boxWidth - 20, minX + (maxX - minX) / 2 - boxWidth / 2)),
      top: Math.min(canvasSize.height - boxHeight - 20, maxY + padding),
      arrowDir: "none",
    };
  };

  // Redraw canvas whenever drawing elements, size, color, or brush width change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and draw white background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid pattern background (Apple-style subtle grid)
    ctx.strokeStyle = "rgba(0, 0, 0, 0.03)";
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Drawing helper
    const drawStroke = (points: Point[], color: string, width: number) => {
      if (points.length === 0) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    };

    // Render saved strokes
    strokes.forEach((stroke) => {
      drawStroke(stroke.points, stroke.color, stroke.width);
    });

    // Render active drawing stroke
    if (currentStroke.length > 0) {
      drawStroke(currentStroke, currentColor, currentWidth);
    }
  }, [canvasSize, strokes, currentStroke, currentColor, currentWidth]);

  // Get mouse or touch coordinates relative to canvas
  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Drawing event handlers
  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if ("touches" in e) {
      // Prevent scrolling on touch screens when drawing
      e.preventDefault();
    }
    const coords = getCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    setCurrentStroke([coords]);
    setRedoStack([]); // Clear redo stack on new action
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    if ("touches" in e) {
      e.preventDefault();
    }
    const coords = getCoordinates(e);
    if (!coords) return;

    setCurrentStroke((prev) => [...prev, coords]);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentStroke.length > 1) {
      setStrokes((prev) => [
        ...prev,
        { points: currentStroke, color: currentColor, width: currentWidth },
      ]);
    }
    setCurrentStroke([]);
  };

  // Canvas Actions
  const undo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    setRedoStack((prev) => [...prev, last]);
    setStrokes((prev) => prev.slice(0, -1));
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setStrokes((prev) => [...prev, next]);
  };

  const clearCanvas = () => {
    if (strokes.length === 0) return;
    setStrokes([]);
    setRedoStack([]);
    setCurrentStroke([]);
    setCaptureStatus("empty");
    setTutorFeedback(null);
    setSelectedFrame(null);
  };

  // Function to crop canvas to drawing bounding box + 20px padding
  const cropCanvasToBoundingBox = (padding = 20): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !boundingBox) return null;

    const { minX, minY, maxX, maxY } = boundingBox;
    const width = maxX - minX;
    const height = maxY - minY;

    // Apply padding
    let cropX = minX - padding;
    let cropY = minY - padding;
    let cropWidth = width + padding * 2;
    let cropHeight = height + padding * 2;

    // Clamp coordinates to canvas bounds
    cropX = Math.max(0, cropX);
    cropY = Math.max(0, cropY);
    cropWidth = Math.min(canvas.width - cropX, cropWidth);
    cropHeight = Math.min(canvas.height - cropY, cropHeight);

    if (cropWidth <= 0 || cropHeight <= 0) return null;

    // Create offscreen canvas for output slice
    const offscreen = document.createElement("canvas");
    offscreen.width = cropWidth;
    offscreen.height = cropHeight;

    const ctx = offscreen.getContext("2d");
    if (!ctx) return null;

    // Fill white background for cropped frame
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, cropWidth, cropHeight);

    // Draw the main canvas segment
    ctx.drawImage(
      canvas,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    return offscreen.toDataURL("image/png");
  };

  // Capture frame and upload to Next.js API route
  const captureAndUploadFrame = async () => {
    if (strokes.length === 0 && currentStroke.length === 0) {
      setCaptureStatus("empty");
      return;
    }

    // Change Detection: stringify current stroke coordinates and properties
    const currentStrokesStr = JSON.stringify(strokes);
    if (currentStrokesStr === lastCapturedStrokesRef.current) {
      setCaptureStatus("no-change");
      return;
    }

    setCaptureStatus("capturing");

    try {
      const croppedBase64 = cropCanvasToBoundingBox(20);
      if (!croppedBase64) {
        setCaptureStatus("error");
        return;
      }

      setLastCapturedPreview(croppedBase64);
      const timestamp = Date.now();

      const response = await fetch("/api/capture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: croppedBase64,
          timestamp,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      console.log("[Capture API Success Response]:", data);
      
      // Update states
      lastCapturedStrokesRef.current = currentStrokesStr;
      setCaptureStatus("saved");
      setLastCapturedTime(new Date().toLocaleTimeString());
      if (data.tutorFeedback) {
        setTutorFeedback(data.tutorFeedback);
      }
      
      const newFrame: CapturedFrame = {
        name: data.fileName,
        time: new Date().toLocaleTimeString(),
        size: `${(data.bytes / 1024).toFixed(1)} KB`,
        success: true,
        tutorFeedback: data.tutorFeedback,
      };
      
      setCapturedFrames((prev) => [newFrame, ...prev].slice(0, 15)); // Keep latest 15
    } catch (error) {
      console.error("[Capture Loop Error]:", error);
      setCaptureStatus("error");
    }
  };

  // 1 FPS auto-capture trigger loop
  useEffect(() => {
    if (!autoCapture) {
      setCaptureStatus("idle");
      return;
    }

    const interval = setInterval(() => {
      captureAndUploadFrame();
    }, 1000); // 1 frame per second (1 FPS)

    return () => clearInterval(interval);
  }, [autoCapture, strokes]);

  return (
    <div className="flex flex-1 flex-col lg:flex-row h-full bg-[#F5F5F7] text-[#1D1D1F] p-4 lg:p-6 gap-6 font-sans antialiased overflow-hidden">
      {/* Main Canvas Workspace */}
      <div className="flex flex-col flex-1 relative h-full">
        {/* Apple Style Top Header */}
        <div className="flex items-center justify-between mb-4 bg-white/70 backdrop-blur-md px-6 py-3 rounded-2xl border border-zinc-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            {/* Window controls styling */}
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#27C93F] inline-block" />
            </div>
            <h1 className="text-sm font-semibold tracking-tight text-zinc-800 ml-2">
              Apple Canvas Studio
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-medium bg-zinc-100 border border-zinc-200 text-zinc-500 rounded-full">
              VLM Pipeline Prep
            </span>
          </div>

          {/* <div className="flex items-center gap-4 text-xs text-zinc-500 font-medium">
            {autoCapture && (
              <span className="flex items-center gap-1.5 text-[#24A148]">
                <span className="w-2 h-2 rounded-full bg-[#24A148] animate-pulse" />
                Live 1 FPS Pipeline
              </span>
            )}
            {!autoCapture && (
              <span className="text-zinc-400">Capture Paused</span>
            )}
          </div> */}
        </div>

        {/* Canvas drawing container */}
        <div
          ref={containerRef}
          className="flex-1 w-full relative bg-white rounded-3xl border border-zinc-200/85 shadow-[0_12px_40px_rgba(0,0,0,0.03)] overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="absolute inset-0 cursor-crosshair touch-none"
          />

          {/* TEMPORARY DEBUG OVERLAY */}
          <div 
            style={{
              position: 'absolute',
              top: '100px', 
              left: '100px',
              zIndex: 9999, 
              fontFamily: 'var(--font-caveat), cursive',
              fontSize: '24px',
              color: '#D22630',
              backgroundColor: 'rgba(254, 242, 242, 0.95)',
              padding: '10px',
              border: '1px solid #ef4444',
              pointerEvents: 'auto',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            TUTOR TEST: Can you see me?
          </div>

          {/* Dynamic HTML Bounding Box Overlay */}
          {showBoundingBox && boundingBox && (
            <div
              className="absolute border-2 border-dashed border-zinc-400/70 rounded pointer-events-none transition-all duration-75 shadow-[0_0_0_9999px_rgba(0,0,0,0.015)]"
              style={{
                left: `${boundingBox.minX - 20}px`,
                top: `${boundingBox.minY - 20}px`,
                width: `${boundingBox.maxX - boundingBox.minX + 40}px`,
                height: `${boundingBox.maxY - boundingBox.minY + 40}px`,
              }}
            >
              {/* Size Badge */}
              <span className="absolute -top-6 left-0 bg-zinc-800 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow">
                Crop Region: {Math.round(boundingBox.maxX - boundingBox.minX + 40)} x{" "}
                {Math.round(boundingBox.maxY - boundingBox.minY + 40)} px (+20px padding)
              </span>
            </div>
          )}

          {strokes.length === 0 && currentStroke.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-zinc-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mb-3 opacity-60"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              <p className="text-sm font-medium">Draw something to begin captures</p>
            </div>
          )}

          {/* Dynamic CS Tutor Handwriting Visual Overlay (Step 2) */}
          {showOverlayHints && (tutorFeedback || selectedFrame?.tutorFeedback) && (
            (() => {
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
            })()
          )}
        </div>

        {/* Bottom Floating Drawing Toolbar */}
        <div className="flex justify-center mt-4">
          <div className="flex flex-wrap items-center justify-center gap-5 bg-white/80 backdrop-blur-lg px-6 py-3.5 rounded-2xl border border-zinc-200/90 shadow-[0_8px_32px_rgba(0,0,0,0.06)] max-w-full">
            {/* Drawing Colors */}
            <div className="flex items-center gap-2">
              {[
                { color: "#1D1D1F", name: "Apple Ink" },
                { color: "#0066CC", name: "Sapphire" },
                { color: "#D22630", name: "Ruby" },
                { color: "#24A148", name: "Emerald" },
              ].map((c) => (
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
              {[2, 4, 8, 16].map((w) => (
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

        {/* Live VLM CS Tutor Feedback Console */}
      {/* {(tutorFeedback || selectedFrame?.tutorFeedback) && (
          (() => {
            const activeFeedback = selectedFrame?.tutorFeedback || tutorFeedback;
            if (!activeFeedback) return null;
            
            return (
              <div className="mt-4 bg-[#1E1E1F] rounded-2xl border border-zinc-800 shadow-[0_8px_30px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col shrink-0">
                {/* Header bar 
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#252526] border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]/80 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]/80 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]/80 inline-block" />
                    </div>
                    <span className="text-[10px] font-mono font-medium text-zinc-400 ml-2">
                      {selectedFrame 
                        ? `INSPECTOR: ${selectedFrame.name}` 
                        : "LIVE CS TUTOR FEEDBACK (Groq Llama-4-Scout)"
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedFrame && (
                      <button
                        onClick={() => setSelectedFrame(null)}
                        className="text-[10px] text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 transition cursor-pointer"
                      >
                        Back to Live Feed
                      </button>
                    )}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeFeedback.code);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 rounded border border-zinc-700 transition cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M20 6 9 17l-5-5"/></svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                          Copy Code
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Content body (Split-view for code and tutor guidance)
                <div className="flex flex-col md:flex-row">
                  {/* Left Side: Code Editor
                  <div className="flex-1 p-4 overflow-y-auto max-h-[220px] font-mono text-[11px] text-zinc-300 select-text whitespace-pre bg-[#1E1E1F] border-r border-zinc-800/50">
                    <div className="text-[10px] uppercase font-bold text-zinc-500 mb-2 border-b border-zinc-800/40 pb-1">Transcribed Code</div>
                    <code>{activeFeedback.code}</code>
                  </div>
                  
                  {/* Right Side: Tutor Insights 
                  <div className="w-full md:w-80 p-4 bg-[#1b1b1c] max-h-[220px] overflow-y-auto text-xs flex flex-col gap-3.5">
                    {/* Detected Logic 
                    <div>
                      <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1 border-b border-zinc-800/40 pb-1">Detected Intent</div>
                      <span className="inline-block bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono px-2 py-0.5 rounded mt-1">
                        {activeFeedback.logic_intent}
                      </span>
                    </div>

                    {/* Tutor Hint Card
                    <div>
                      <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1 border-b border-zinc-800/40 pb-1">Tutor Guidance Hint</div>
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-amber-200 text-xs leading-relaxed font-sans mt-1.5 shadow-sm">
                        <div className="font-semibold mb-0.5 text-amber-400 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                          Tutor Suggestion
                        </div>
                        {activeFeedback.tutor_hint}
                      </div>
                    </div>

                    {/* Missing Edge Cases Checklist 
                    {activeFeedback.missing_edge_cases && activeFeedback.missing_edge_cases.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1.5 border-b border-zinc-800/40 pb-1">Missing Edge Cases Checklist</div>
                        <ul className="flex flex-col gap-1.5 font-sans mt-1">
                          {activeFeedback.missing_edge_cases.map((caseItem, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-zinc-405 text-[11px]">
                              <span className="w-3.5 h-3.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-400 flex items-center justify-center font-mono shrink-0 font-bold scale-90">
                                !
                              </span>
                              <span className="leading-tight text-zinc-405">{caseItem}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()
        )} */}
      </div>

      {/* Side Inspector Controls Panel */}
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
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      selectedFrame?.name === f.name ? "bg-zinc-700 text-zinc-200" : "bg-zinc-200/50 text-zinc-500"
                    }`}>
                      {f.size}
                    </span>
                    <span className="text-[9px] bg-green-100 text-green-800 px-1 rounded uppercase font-semibold scale-90">
                      VLM Ready
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
