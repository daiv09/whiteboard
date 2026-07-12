import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/mimic
 * Expects { text: string, priming_strokes: any[], bias: number } in JSON body.
 * Proxies the request to the local Python HandwritingGenService on port 5001.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Forward the request to the Python micro-service on port 5001
    const response = await fetch("http://localhost:5001/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Python service responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Mimic API Error]:", error);
    return NextResponse.json(
      { error: "Failed to generate handwriting", details: error.message },
      { status: 500 }
    );
  }
}
