import { useState, useEffect, useRef } from 'react';
import { Stroke, Point, CapturedFrame, TutorFeedback } from '../types/whiteboard';

export type CaptureStatus = "idle" | "capturing" | "saved" | "no-change" | "error" | "empty";

interface UseCaptureProps {
  strokes: Stroke[];
  currentStroke: Point[];
  cropCanvasToBoundingBox: (padding?: number) => string | null;
}

export function useCapture({ strokes, currentStroke, cropCanvasToBoundingBox }: UseCaptureProps) {
  const [autoCapture, setAutoCapture] = useState(true);
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>("empty");
  const [lastCapturedPreview, setLastCapturedPreview] = useState<string | null>(null);
  const [capturedFrames, setCapturedFrames] = useState<CapturedFrame[]>([]);
  const [lastCapturedTime, setLastCapturedTime] = useState<string | null>(null);
  const [tutorFeedback, setTutorFeedback] = useState<TutorFeedback | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<CapturedFrame | null>(null);

  const lastCapturedStrokesRef = useRef<string>("");

  const clearCaptureState = () => {
    setCaptureStatus("empty");
    setTutorFeedback(null);
    setSelectedFrame(null);
  };

  const captureAndUploadFrame = async () => {
    if (strokes.length === 0 && currentStroke.length === 0) {
      setCaptureStatus("empty");
      return;
    }

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

  useEffect(() => {
    if (!autoCapture) {
      setCaptureStatus("idle");
      return;
    }

    const interval = setInterval(() => {
      captureAndUploadFrame();
    }, 1000); 

    return () => clearInterval(interval);
  }, [autoCapture, strokes, currentStroke, cropCanvasToBoundingBox]);

  return {
    autoCapture,
    setAutoCapture,
    captureStatus,
    setCaptureStatus,
    lastCapturedPreview,
    capturedFrames,
    lastCapturedTime,
    tutorFeedback,
    setTutorFeedback,
    selectedFrame,
    setSelectedFrame,
    clearCaptureState,
  };
}
