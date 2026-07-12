import fs from "fs";
import path from "path";
import { HfInference } from "@huggingface/inference";

export interface TutorFeedback {
  code: string;
  logic_intent: string;
  missing_edge_cases: string[];
  tutor_hint: string;
  no_algorithm?: boolean;
}

/**
 * Helper to extract raw JSON content from LLM markdown code blocks
 */
function extractJsonContent(rawText: string): string {
  const clean = rawText.trim();
  
  // Try to extract content inside ```json ... ```
  const jsonMatch = clean.match(/```json\s*([\s\S]*?)\s*```/i);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }

  // Try to extract content inside ``` ... ```
  const codeMatch = clean.match(/```\s*([\s\S]*?)\s*```/);
  if (codeMatch) {
    return codeMatch[1].trim();
  }

  return clean;
}

/**
 * AlgorithmVisionService
 * Interfaces with Groq API (via HF SDK) to provide intelligent algorithm tutoring.
 */
export class AlgorithmVisionService {
  static async processFrame(
    imageBuffer: Buffer,
    timestamp: number,
  ): Promise<TutorFeedback> {
    const sizeKb = (imageBuffer.length / 1024).toFixed(2);
    console.log(
      `[AlgorithmVisionService] Processing frame ${timestamp} (Size: ${sizeKb} KB)`,
    );

    const groqToken = process.env.GROQ_API_KEY;
    if (!groqToken) {
      console.warn("[AlgorithmVisionService] Warning: GROQ_API_KEY missing.");
      return {
        code: "// Error: Missing API Key",
        logic_intent: "Configuration Error",
        missing_edge_cases: [],
        tutor_hint: "Please configure your GROQ_API_KEY inside your .env.local file.",
        no_algorithm: false
      };
    }

    let feedback: TutorFeedback;

    try {
      const base64Image = imageBuffer.toString("base64");
      const hf = new HfInference(groqToken, {
        endpointUrl: "https://api.groq.com/openai/v1",
      });

      const response = await hf.chatCompletion({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: 'You are a Senior Computer Science Tutor. Analyze this whiteboard image.\n\n1. If the content is not an algorithm, output exactly: [[NO_ALGORITHM_DETECTED]]\n2. If it is an algorithm, output the data in this exact JSON format:\n{\n  "code": "cleaned_code_block",\n  "logic_intent": "brief_description_of_algorithm_intent",\n  "missing_edge_cases": ["edgecase_1", "edgecase_2", ...],\n  "tutor_hint": "constructive_tutor_hint_for_improvement"\n}\n\nReturn ONLY the JSON string. Do not wrap it in markdown block tags if possible, but if you do, format it correctly as JSON. If the handwriting is incomplete, focus on inferring the likely intent of the logic. Return ONLY the code inside the "code" field.',
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1024,
        temperature: 0.1,
      });

      const rawContent = response.choices?.[0]?.message?.content || "";
      console.log(`[AlgorithmVisionService] Raw VLM Output:\n${rawContent}\n-------------------------`);

      if (rawContent.includes("[[NO_ALGORITHM_DETECTED]]")) {
        console.log("[AlgorithmVisionService] No algorithm detected in frame.");
        feedback = {
          code: "// No algorithm detected on board.",
          logic_intent: "No algorithm detected.",
          missing_edge_cases: [],
          tutor_hint: "Please write or sketch an algorithm (Python, C++, Java) on the whiteboard to receive active feedback.",
          no_algorithm: true
        };
      } else {
        try {
          const jsonText = extractJsonContent(rawContent);
          const parsedData = JSON.parse(jsonText);
          
          feedback = {
            code: parsedData.code || "// Transcription empty",
            logic_intent: parsedData.logic_intent || "Undetermined logic",
            missing_edge_cases: parsedData.missing_edge_cases || [],
            tutor_hint: parsedData.tutor_hint || "Looks good, keep going!",
            no_algorithm: false
          };
          
          console.log(`[Tutor Hint]: ${feedback.tutor_hint}`);
        } catch (parseError) {
          console.error("Failed to parse LLM JSON. Attempting fallback parse of raw content...", parseError);
          feedback = {
            code: rawContent,
            logic_intent: "Raw output (Parsing failed)",
            missing_edge_cases: [],
            tutor_hint: "Could not parse JSON response from VLM. See console logs.",
            no_algorithm: false
          };
        }
      }
    } catch (error: any) {
      console.error("[AlgorithmVisionService VLM Error]:", error.message);
      feedback = {
        code: `// Error during VLM inference: ${error.message}`,
        logic_intent: "Inference Error",
        missing_edge_cases: [],
        tutor_hint: `Connection failed: ${error.message}. Verify network proxy or API quota.`,
        no_algorithm: false
      };
    }

    // Save outputs
    try {
      const outputDir = path.join(process.cwd(), "public", "output");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write matching .txt file (just the code)
      fs.writeFileSync(
        path.join(outputDir, `frame_${timestamp}.txt`),
        feedback.code,
        "utf8",
      );

      // Write full metadata to .json file for inspection
      fs.writeFileSync(
        path.join(outputDir, `frame_${timestamp}.json`),
        JSON.stringify(feedback, null, 2),
        "utf8",
      );
    } catch (fsError) {
      console.error("FS Error:", fsError);
    }

    return feedback;
  }
}
