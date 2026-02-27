import { GoogleGenAI, Type } from "@google/genai";
import { TattooFormData, TattooConcept } from "../types";

// Initialize the Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateConcepts(data: TattooFormData): Promise<TattooConcept[]> {
  const prompt = `You are a master tattoo artist and creative director.
A client wants a tattoo with the following details:
- Style: ${data.style}
- Meaning/Story: ${data.meaning}
- Body Part: ${data.bodyPart}
- Size: ${data.size}

Generate 3 unique, highly creative tattoo concepts.
For each concept, provide:
1. A catchy title.
2. A narrative explaining the design and how it connects to their story (in Spanish, as the user is speaking Spanish).
3. A technical prompt that will be used to generate the raw flash design (black and white, clean lines, high contrast, pure white background).`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Concept title (in Spanish)" },
            narrative: { type: Type.STRING, description: "Explanation for the client (in Spanish)" },
            technicalPrompt: { type: Type.STRING, description: "Prompt for image generation model (in English)" }
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
  const styleInstruction = style ? ` MUST BE STRICTLY IN ${style.toUpperCase()} TATTOO STYLE.` : '';
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: `A raw flash tattoo design on a pure white background. Clean lines, high contrast.${styleInstruction} DESIGN: ${technicalPrompt}`,
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
  const prompt = `You are a master digital retoucher and VFX artist. I am providing a photo where a flat tattoo design has been overlaid on a person's body.
Your objective is to realistically integrate the tattoo design into the reference photo, making it indistinguishable from a real, healed tattoo.

CRITICAL REQUIREMENTS:
1. BODY ANATOMY & DEPTH: You MUST warp, curve, and displace the tattoo design so it perfectly follows the 3D volume, muscles, bones, and contours of the body. It cannot look flat.
2. SHADOWS & LIGHTS: You MUST respect the original lighting. Apply the exact shadows, highlights, and ambient occlusion from the body directly onto the tattoo ink.
3. TEXTURE & SKIN TONE: The tattoo must blend realistically with the underlying skin tone. Skin pores, micro-texture, fine hairs, and specular highlights must be visible over the ink.
4. FIDELITY: Do NOT alter the person's identity, face, body shape, or the background. ONLY enhance the tattoo's integration to make it photorealistic.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
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
