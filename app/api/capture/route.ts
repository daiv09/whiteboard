import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { AlgorithmVisionService } from "@/lib/services/AlgorithmVisionService";

/**
 * POST /api/capture
 * Expects { image: string, timestamp: number } in JSON body.
 * Saves the cropped image as a PNG frame and processes it via AlgorithmVisionService.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, timestamp } = body;

    if (!image) {
      return NextResponse.json(
        { error: "Image data is required" },
        { status: 400 }
      );
    }

    if (!timestamp) {
      return NextResponse.json(
        { error: "Timestamp is required" },
        { status: 400 }
      );
    }

    // 1. Ensure the /public/output directory exists
    const outputDir = path.join(process.cwd(), "public", "output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 2. Decode the base64 image data
    // Handles formats: "data:image/png;base64,iVBOR..." or just raw base64 string
    const match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    let base64Payload = image;
    let extension = "png";

    if (match) {
      extension = match[1];
      base64Payload = match[2];
    }

    const imageBuffer = Buffer.from(base64Payload, "base64");

    // 3. Write file sequentially to public/output/frame_${timestamp}.png
    const fileName = `frame_${timestamp}.${extension}`;
    const filePath = path.join(outputDir, fileName);
    
    fs.writeFileSync(filePath, imageBuffer);

    // 4. Pass buffer to VLM Service
    const tutorFeedback = await AlgorithmVisionService.processFrame(imageBuffer, timestamp);

    return NextResponse.json({
      success: true,
      fileName,
      path: `/output/${fileName}`,
      bytes: imageBuffer.length,
      timestamp,
      tutorFeedback,
    });
  } catch (error: any) {
    console.error("[Capture API Error]:", error);
    return NextResponse.json(
      { error: "Failed to process and store canvas frame", details: error.message },
      { status: 500 }
    );
  }
}
