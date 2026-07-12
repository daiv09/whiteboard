import sys
import os
import math
from typing import List, Optional, Tuple

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


class Point(BaseModel):
    x: float
    y: float
    pressure: Optional[float] = 0.5
    t: Optional[float] = 0.0

class PrimingChar(BaseModel):
    char: str
    strokes: List[List[Point]]

class PrimeRequest(BaseModel):
    priming_strokes: List[PrimingChar]
    text: str
    bias: float = 0.75

class SynthesisResponse(BaseModel):
    rawSequence: List[Tuple[float, float, float]]  # pen_up, dx, dy

app = FastAPI(title="Handwriting Synthesis Gen Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_model = None

def _try_load_model():
    global _model
    repo_path = os.path.join(os.path.dirname(__file__), "..", "handwriting-synthesis")
    if os.path.isdir(repo_path):
        sys.path.insert(0, os.path.abspath(repo_path))
        try:
            from rnn import rnn
            _model = rnn.Model()
            _model.load(os.path.join(repo_path, "data", "weights"))
            print("[HandwritingGenService] Graves-RNN model loaded OK")
        except Exception as e:
            print(f"[HandwritingGenService] WARNING: Could not load Graves-RNN: {e}")
    else:
        print("[HandwritingGenService] handwriting-synthesis repo not found — using mock synthesiser")

_try_load_model()

def _mock_synthesise(text: str, bias: float, priming: List[PrimingChar]) -> List[Tuple[float, float, float]]:
    results = []
    
    # derive slant
    slant = 0.0
    all_pts = [pt for pc in priming for strk in pc.strokes for pt in strk]
    if len(all_pts) >= 2:
        total_dx = sum(all_pts[i + 1].x - all_pts[i].x for i in range(len(all_pts) - 1))
        total_dy = sum(abs(all_pts[i + 1].y - all_pts[i].y) for i in range(len(all_pts) - 1))
        slant = (total_dx / max(total_dy, 1)) * 0.12

    CHAR_W = 14.0
    CHAR_H = 20.0
    LINE_H = 36.0
    MAX_W  = 300.0

    x_cursor = 0.0
    y_cursor = 0.0

    last_x, last_y = 0.0, 0.0

    for char in text:
        if char == "\n" or x_cursor > MAX_W:
            x_cursor = 0.0
            y_cursor += LINE_H
            continue
        if char == " ":
            x_cursor += CHAR_W * 0.6
            continue

        n_pts = 6
        for i in range(n_pts):
            frac = i / max(n_pts - 1, 1)
            target_x = x_cursor + frac * CHAR_W + frac * CHAR_H * slant
            target_y = y_cursor + frac * CHAR_H
            
            dx = target_x - last_x
            dy = target_y - last_y
            
            pen_up = 1.0 if i == 0 else 0.0
            results.append((pen_up, dx, dy))
            
            last_x = target_x
            last_y = target_y

        x_cursor += CHAR_W

    return results

def _graves_synthesise(text: str, bias: float, priming: List[PrimingChar]) -> List[Tuple[float, float, float]]:
    import numpy as np

    prime_seq = []
    for pc in priming:
        for strk in pc.strokes:
            for pt in strk:
                prime_seq.append([pt.x, pt.y, 0])
            if prime_seq:
                prime_seq[-1][2] = 1

    prime_np = np.array(prime_seq, dtype=np.float32) if prime_seq else None
    raw = _model.sample(text, prime=prime_np, bias=bias)
    
    results = []
    for dx, dy, pen_up in raw:
        results.append((float(pen_up), float(dx), float(dy)))
    return results

@app.get("/health")
def health():
    return {"status": "ok", "model": "graves-rnn" if _model else "mock"}

@app.post("/generate", response_model=SynthesisResponse)
def synthesize(req: PrimeRequest):
    try:
        if _model is not None:
            rawSeq = _graves_synthesise(req.text, req.bias, req.priming_strokes)
        else:
            rawSeq = _mock_synthesise(req.text, req.bias, req.priming_strokes)
        return SynthesisResponse(rawSequence=rawSeq)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
