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
  const prompt = `You are a world-class AI tattoo adaptation specialist. I am providing an image of a person with a digital tattoo mockup placed on their body.
Your task is to merge this tattoo into the body with absolute photorealism and anatomical accuracy.

CRITICAL INSTRUCTIONS:
1. ANATOMICAL ADAPTATION (THE MOST IMPORTANT): 
   - If the tattoo mockup is larger than the body part (e.g., wrap around a branch, muscle, or torso), you MUST simulate the design wrapping around the curvature of the body.
   - Parts of the design that would logically "go behind" the limb or body part must be HIDDEN. 
   - The design must NOT stay "in the air" or floating outside the skin. It must conform strictly to the biological boundaries of the person.
   - Apply geometric distortion as if the design were projected onto a 3D cylindrical or organic surface (the body).

2. CONSISTENCY:
   - DO NOT change the person's identity, face, clothing, or the background.
   - DO NOT change the core design of the tattoo, but DO adapt its perspective and warp it to fit the body's shape.

3. BLENDING:
   - Apply realistic skin texture (pores, hair, fine lines) over the ink.
   - Adjust lighting, highlights, and shadows on the tattoo to perfectly match the environment and the body's contours.
   - Use 'Multiply' style blending but with intelligent opacity adjustment for skin highlights.

The final result must look like a real, healed photograph taken with a professional camera.`;

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
