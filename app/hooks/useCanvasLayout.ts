import { useState, useEffect, useMemo, RefObject } from 'react';
import { Stroke, Point } from '../types/whiteboard';

interface UseCanvasLayoutProps {
  containerRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  strokes: Stroke[];
  currentStroke: Point[];
}

export function useCanvasLayout({
  containerRef,
  canvasRef,
  strokes,
  currentStroke,
}: UseCanvasLayoutProps) {
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [showBoundingBox, setShowBoundingBox] = useState(false);

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
    
    const timer = setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [containerRef]);

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

  const getOverlayPosition = () => {
    if (!boundingBox || !canvasSize.width) return null;
    const { minX, minY, maxX, maxY } = boundingBox;
    const boxWidth = 240;
    const boxHeight = 120;
    const padding = 30;

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

    return {
      left: Math.max(20, Math.min(canvasSize.width - boxWidth - 20, minX + (maxX - minX) / 2 - boxWidth / 2)),
      top: Math.min(canvasSize.height - boxHeight - 20, maxY + padding),
      arrowDir: "none",
    };
  };

  const cropCanvasToBoundingBox = (padding = 20): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !boundingBox) return null;

    const { minX, minY, maxX, maxY } = boundingBox;
    const width = maxX - minX;
    const height = maxY - minY;

    let cropX = minX - padding;
    let cropY = minY - padding;
    let cropWidth = width + padding * 2;
    let cropHeight = height + padding * 2;

    cropX = Math.max(0, cropX);
    cropY = Math.max(0, cropY);
    cropWidth = Math.min(canvas.width - cropX, cropWidth);
    cropHeight = Math.min(canvas.height - cropY, cropHeight);

    if (cropWidth <= 0 || cropHeight <= 0) return null;

    const offscreen = document.createElement("canvas");
    offscreen.width = cropWidth;
    offscreen.height = cropHeight;

    const ctx = offscreen.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, cropWidth, cropHeight);

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

  return {
    canvasSize,
    boundingBox,
    getOverlayPosition,
    cropCanvasToBoundingBox,
    showBoundingBox,
    setShowBoundingBox,
  };
}
