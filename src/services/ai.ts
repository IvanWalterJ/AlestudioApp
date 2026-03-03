import { GoogleGenAI, Type } from "@google/genai";
import { TattooFormData, TattooConcept } from "../types";

// Initialize the Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * We use a wide range of model IDs because the user seems to be in a special preview
 * with access to Gemini 3 and Imagen 4. We include standard and preview IDs.
 */
const MODELS = {
  TEXT: [
    "gemini-2.0-flash",
    "gemini-2.0-flash-exp",
    "gemini-3.1-flash",
    "gemini-3.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-1.5-pro-latest",
    "gemini-2.0-pro-exp",
    "gemini-3-pro"
  ],
  IMAGE: [
    "imagen-3.0-generate-001",
    "imagen-3.0-flash-001",
    "imagen-4.0-generate-001",
    "gemini-2.0-flash" // Gemini 2.0 can also generate images in some regions/configs
  ]
};

/**
 * Enhanced waterfall helper to try multiple models in sequence
 */
async function generateWithWaterfall(options: any, modelList: string[]) {
  console.log("Starting waterfall with models:", modelList);
  let lastError: any = null;

  for (const modelName of modelList) {
    try {
      console.log(`[Waterfall] Trying model: ${modelName}`);
      const result = await ai.models.generateContent({
        ...options,
        model: modelName
      });
      console.log(`[Waterfall] Success with model: ${modelName}`);
      return result;
    } catch (error: any) {
      lastError = error;
      const status = error.status || (error.response?.status);
      const message = error.message || "";

      console.warn(`[Waterfall] Model ${modelName} failed (Status: ${status}). Message: ${message}`);

      // We continue for almost any retryable error (Quota, Not Found, Server Error)
      // and even for "Not Found" because availability varies by project/region.
      continue;
    }
  }

  console.error("[Waterfall] CRITICAL: All models failed.", lastError);
  throw lastError;
}

export async function generateConcepts(data: TattooFormData): Promise<TattooConcept[]> {
  const referenceContext = data.referenceImage
    ? "The client has provided a reference image to guide the style and composition."
    : "";

  const prompt = `You are a master tattoo artist and creative director.
A client wants a tattoo with the following details:
- Style: ${data.style}
- Meaning/Story: ${data.meaning}
- Body Part: ${data.bodyPart}
${referenceContext}

Generate 3 unique, highly creative tattoo concepts that are STUNNING and IMPACTFUL.
For each concept, provide:
1. A catchy title.
2. A narrative explaining the design and how it connects to their story (in Spanish).
3. A technical prompt for a high-end image generation model. 
   THE TECHNICAL PROMPT MUST SPECIFY:
   - Pure, hospital-white background.
   - Crisp, high-contrast black ink.
   - NO SKIN, NO BACKGROUND NOISE, NO HUMANS. JUST THE TATTOO DESIGN ON WHITE.`;

  const parts: any[] = [{ text: prompt }];
  if (data.referenceImage) {
    parts.push({
      inlineData: {
        data: data.referenceImage.split(',')[1],
        mimeType: data.referenceImage.split(';')[0].split(':')[1],
      }
    });
  }

  const response = await generateWithWaterfall({
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            narrative: { type: Type.STRING },
            technicalPrompt: { type: Type.STRING }
          },
          required: ["title", "narrative", "technicalPrompt"]
        }
      }
    }
  }, MODELS.TEXT);

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse concepts", e);
    return [];
  }
}

export async function generateTattooImage(technicalPrompt: string, style?: string): Promise<string> {
  const options = {
    contents: {
      parts: [
        {
          text: `A professional tattoo flash design SUBJECT: ${technicalPrompt}. 
STYLE: ${style || 'Artistic'}. 
BACKGROUND: PURE SOLID WHITE (#FFFFFF). NO SKIN. MASTERPIECE QUALITY.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      }
    }
  };

  const response = await generateWithWaterfall(options, MODELS.IMAGE);

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated after trying all models");
}

export async function generateFinalTryOn(composedImageBase64: string): Promise<string> {
  const prompt = `You are a photorealistic tattoo retoucher. Transform this overlay into a STUNNING, HYPER-REALISTIC photograph. 
Ink must look sub-dermal, follow skin texture and anatomical curvature perfectly. 
Match original lighting. Preserve all skin details.`;

  const options = {
    contents: {
      parts: [
        {
          inlineData: {
            data: composedImageBase64.split(',')[1],
            mimeType: composedImageBase64.split(';')[0].split(':')[1],
          },
        },
        {
          text: prompt,
        },
      ],
    }
  };

  const response = await generateWithWaterfall(options, MODELS.IMAGE);

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated for try-on");
}

export async function analyzeAutoPlacement(bodyImageBase64: string, designImageBase64: string): Promise<{ x: number, y: number, scale: number, rotation: number }> {
  const prompt = `Find the absolute BEST anatomical position, scale, and rotation for this tattoo.
RETURN ONLY JSON: { x: number (-100 to 100), y: number (-100 to 100), scale: number (0.5 to 2.5), rotation: number (-180 to 180) }`;

  const response = await generateWithWaterfall({
    contents: {
      parts: [
        {
          inlineData: {
            data: bodyImageBase64.split(',')[1],
            mimeType: bodyImageBase64.split(';')[0].split(':')[1],
          }
        },
        {
          inlineData: {
            data: designImageBase64.split(',')[1],
            mimeType: designImageBase64.split(';')[0].split(':')[1],
          }
        },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          x: { type: Type.NUMBER },
          y: { type: Type.NUMBER },
          scale: { type: Type.NUMBER },
          rotation: { type: Type.NUMBER }
        },
        required: ["x", "y", "scale", "rotation"]
      }
    }
  }, MODELS.TEXT);

  try {
    return JSON.parse(response.text || '{ "x": 0, "y": 0, "scale": 1, "rotation": 0 }');
  } catch (e) {
    console.error("Failed to parse placement", e);
    return { x: 0, y: 0, scale: 1, rotation: 0 };
  }
}
