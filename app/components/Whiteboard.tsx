"use client";

import React, { useRef, useEffect } from "react";
import { useDrawing } from "../hooks/useDrawing";
import { useCanvasLayout } from "../hooks/useCanvasLayout";
import { useCapture } from "../hooks/useCapture";
import { Toolbar } from "./whiteboard/Toolbar";
import { Sidebar } from "./whiteboard/Sidebar";
import { OverlayHint } from "./whiteboard/OverlayHint";

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    strokes,
    currentStroke,
    currentColor,
    setCurrentColor,
    currentWidth,
    setCurrentWidth,
    startDrawing,
    draw,
    stopDrawing,
    undo,
    redo,
    clearCanvas: clearCanvasDrawing,
    redoStack,
  } = useDrawing({
    canvasRef,
    onClearCallback: () => clearCaptureState(),
  });

  const {
    canvasSize,
    boundingBox,
    getOverlayPosition,
    cropCanvasToBoundingBox,
    showBoundingBox,
    setShowBoundingBox,
  } = useCanvasLayout({
    containerRef,
    canvasRef,
    strokes,
    currentStroke,
  });

  const {
    autoCapture,
    setAutoCapture,
    captureStatus,
    lastCapturedPreview,
    capturedFrames,
    lastCapturedTime,
    tutorFeedback,
    selectedFrame,
    setSelectedFrame,
    clearCaptureState,
  } = useCapture({
    strokes,
    currentStroke,
    cropCanvasToBoundingBox,
  });

  const [showOverlayHints, setShowOverlayHints] = React.useState(true);

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
    const drawStroke = (points: {x: number; y: number}[], color: string, width: number) => {
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
  }, [canvasSize, strokes, currentStroke, currentColor, currentWidth, canvasRef]);


  return (
    <div className="flex flex-1 flex-col lg:flex-row h-full bg-[#F5F5F7] text-[#1D1D1F] p-4 lg:p-6 gap-6 font-sans antialiased overflow-hidden">
      {/* Main Canvas Workspace */}
      <div className="flex flex-col flex-1 relative h-full">
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

          <OverlayHint
            showOverlayHints={showOverlayHints}
            tutorFeedback={tutorFeedback}
            selectedFrame={selectedFrame}
            getOverlayPosition={getOverlayPosition}
            boundingBox={boundingBox}
          />
        </div>

        <Toolbar
          currentColor={currentColor}
          setCurrentColor={setCurrentColor}
          currentWidth={currentWidth}
          setCurrentWidth={setCurrentWidth}
          undo={undo}
          redo={redo}
          clearCanvas={clearCanvasDrawing}
          strokes={strokes}
          redoStack={redoStack}
        />
      </div>

      <Sidebar
        showBoundingBox={showBoundingBox}
        setShowBoundingBox={setShowBoundingBox}
        showOverlayHints={showOverlayHints}
        setShowOverlayHints={setShowOverlayHints}
        autoCapture={autoCapture}
        setAutoCapture={setAutoCapture}
        captureStatus={captureStatus}
        lastCapturedTime={lastCapturedTime}
        lastCapturedPreview={lastCapturedPreview}
        capturedFrames={capturedFrames}
        selectedFrame={selectedFrame}
        setSelectedFrame={setSelectedFrame}
      />
    </div>
  );
}
