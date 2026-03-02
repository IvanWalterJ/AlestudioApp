import { GoogleGenAI, Type } from "@google/genai";
import { TattooFormData, TattooConcept } from "../types";

// Initialize the Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
2. A narrative explaining the design and how it connects to their story (in Spanish, as the user is speaking Spanish).
3. A technical prompt for a high-end image generation model. 
   THE TECHNICAL PROMPT MUST SPECIFY:
   - Pure, hospital-white background (CRITICAL for clean assets).
   - Crisp, high-contrast black ink (unless the style is specifically color).
   - Artistic, professional composition (e.g., 'masterpiece', 'intricate details', 'sharp focus').
   - Specific motifs that make the design feel premium and state-of-the-art.
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

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
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
          text: `A professional, high-impact tattoo flash design. Masterpiece quality.
SHARP FOCUS, CLEAN LINES, ULTRA-HIGH DETAIL.
BACKGROUND: PURE SOLID WHITE (#FFFFFF). No shadows, no gradients on background.
STYLE: ${style ? style.toUpperCase() : 'ARTISTIC'}.
SUBJECT: ${technicalPrompt}`,
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
  const prompt = `You are a world-class VFX artist and high-end photo retoucher. I am providing a photo where a 2D digital tattoo design has been roughly overlaid onto a person's body.
Your absolute priority is to make this tattoo look 100% REAL, as if it was inked years ago and has healed perfectly into the skin.

CRITICAL INSTRUCTIONS FOR PHOTOREALISM:
1. 3D ANATOMY & WARPING: The tattoo MUST wrap around the body's 3D geometry. Curve it around muscles, bones, and cylindrical shapes (like arms/legs). It must not look like a flat sticker.
2. LIGHTING & SHADOWS: The tattoo ink MUST react to the environment's lighting. Apply the exact same shadows, core shadows, and highlights present on the underlying skin to the tattoo ink.
3. SKIN TEXTURE & BLENDING: Ink lives UNDER the epidermis. You MUST show skin pores, fine hairs, goosebumps, and specular skin highlights OVER the tattoo. The ink should slightly fade at the microscopic edges (ink bleed).
4. COLOR MATCHING: If the tattoo is black, it should match the black levels of the photo's shadows, not be pure #000000. Simulate a 'multiply' blend mode effect.
5. ZERO ALTERATION: DO NOT change the person's face, body, clothing, or background. ONLY process the tattoo area.`;

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
