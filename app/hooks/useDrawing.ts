import { useState, RefObject } from 'react';
import { Stroke, Point } from '../types/whiteboard';

interface UseDrawingProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onClearCallback?: () => void;
}

export function useDrawing({ canvasRef, onClearCallback }: UseDrawingProps) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const [currentColor, setCurrentColor] = useState("#1D1D1F");
  const [currentWidth, setCurrentWidth] = useState(4);

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

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if ("touches" in e) {
      e.preventDefault();
    }
    const coords = getCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    setCurrentStroke([coords]);
    setRedoStack([]);
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
    if (onClearCallback) onClearCallback();
  };

  return {
    strokes,
    setStrokes,
    currentStroke,
    isDrawing,
    currentColor,
    setCurrentColor,
    currentWidth,
    setCurrentWidth,
    startDrawing,
    draw,
    stopDrawing,
    undo,
    redo,
    redoStack,
    clearCanvas,
  };
}
