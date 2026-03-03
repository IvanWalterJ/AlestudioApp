import { GoogleGenAI, Type } from "@google/genai";
import { TattooFormData, TattooConcept } from "../types";

// Initialize the Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODELS = {
  PRIMARY: "gemini-2.0-flash",
  BACKUP: "gemini-1.5-flash",
  IMAGE: "imagen-3.0-generate-001"
};

/**
 * Generic waterfall helper to retry with backup model if primary fails
 */
async function generateWithWaterfall(options: any) {
  try {
    // Try Primary Model (2.0-flash)
    return await ai.models.generateContent({
      ...options,
      model: MODELS.PRIMARY
    });
  } catch (error: any) {
    console.warn(`Primary model (${MODELS.PRIMARY}) failed or saturated. Falling back to ${MODELS.BACKUP}...`, error);

    // Check if it's a "quota" or "overloaded" error (standard 429/503)
    // Even if not, we fallback to ensure service continuity as requested.
    try {
      return await ai.models.generateContent({
        ...options,
        model: MODELS.BACKUP
      });
    } catch (backupError) {
      console.error("Critical: Both primary and backup models failed.", backupError);
      throw backupError;
    }
  }
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
   - Crisp, high-contrast black ink (unless color style).
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
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse concepts", e);
    return [];
  }
}

export async function generateTattooImage(technicalPrompt: string, style?: string): Promise<string> {
  // Image generation doesn't support the same waterfall logic as text (models are different)
  // But we use the requested Imagen 3.0 model.
  const response = await ai.models.generateContent({
    model: MODELS.IMAGE,
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
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated");
}

export async function generateFinalTryOn(composedImageBase64: string): Promise<string> {
  const prompt = `You are a photorealistic tattoo retoucher. Transform this overlay into a STUNNING, HYPER-REALISTIC photograph. 
Ink must look sub-dermal, follow skin texture, pores, and anatomical curvature perfectly. 
Match original lighting. Preserve all skin details.`;

  // Try-on is image-to-image, usually Imagen supports this via specific models or Gemini 2.0 Flash Vision
  // We use the image model requested.
  const response = await ai.models.generateContent({
    model: MODELS.IMAGE,
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
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated");
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
  });

  try {
    return JSON.parse(response.text || '{ "x": 0, "y": 0, "scale": 1, "rotation": 0 }');
  } catch (e) {
    console.error("Failed to parse placement", e);
    return { x: 0, y: 0, scale: 1, rotation: 0 };
  }
}
