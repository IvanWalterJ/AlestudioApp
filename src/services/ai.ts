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
  const prompt = `You are the world's best photorealistic tattoo retoucher — your work is indistinguishable from real photographs of healed tattoos.

I am giving you a photograph of a human body with a digital tattoo design overlaid on the skin. Your job is to transform this into a STUNNING, HYPER-REALISTIC photograph that looks like it was taken by a professional tattoo photographer with a macro lens.

ABSOLUTE REQUIREMENTS — follow every single one:

1. SKIN TEXTURE IS KING:
   - The tattoo ink sits BENEATH the skin's surface layer (epidermis).
   - You MUST render visible skin pores, fine body hairs, and natural skin texture ON TOP of the tattoo ink.
   - Add subtle specular highlights from skin oils that catch light, even over dark ink areas.
   - Include micro-level ink bleeding at the edges of lines — real tattoos never have perfectly crisp digital edges.

2. 3D ANATOMICAL WRAPPING:
   - The design MUST conform to the 3D topology of the body — wrap around muscles, follow the curves of bones, stretch over tendons.
   - Cylindrical body parts (arms, legs) require perspective foreshortening of the design.
   - The tattoo must feel like it was tattooed directly onto THAT specific body, not pasted on.

3. LIGHTING INTEGRATION:
   - Match the EXACT lighting environment of the original photo.
   - Apply cast shadows, ambient occlusion, and specular highlights to the tattoo ink consistently with the rest of the skin.
   - Dark areas of the body should darken the tattoo proportionally. Lit areas should show more detail.

4. INK REALISM:
   - Black ink should look like saturated carbon pigment under skin, NOT digital black (#000000).
   - Color ink (if present) should look slightly muted and warm, as if filtered through a thin layer of skin.
   - Simulate the subtle "raised" quality of freshly healed tattoos with micro-shadows at ink boundaries.
   - Fine lines should show slight ink spread. Bold lines should show gradient density from center to edge.

5. PHOTOGRAPHIC QUALITY:
   - The final result should look like a professional photograph: shallow depth of field, natural bokeh in background.
   - Maintain the exact same camera angle and focal length as the original image.
   - Preserve all skin tones, body hair, freckles, and natural imperfections.

6. PRESERVATION:
   - DO NOT alter the person's face, body shape, clothing, background, or any non-tattoo area.
   - DO NOT add new elements, tattoos, or modifications beyond what is shown in the overlay.
   - DO NOT change the composition or cropping of the image.

The result should be so realistic that a tattoo artist would believe it's a real healed tattoo photograph.`;

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
export async function analyzeAutoPlacement(bodyImageBase64: string, designImageBase64: string): Promise<{ x: number, y: number, scale: number, rotation: number }> {
  const prompt = `You are a master tattoo placement specialist. 
I am providing two images:
1. A photo of a body part where the client wants a tattoo.
2. The tattoo design asset.

Your task is to determine the absolute BEST anatomical position, scale, and rotation for this tattoo so it looks professional, aesthetic, and flows with the body's natural curves.

ANALYSIS RULES:
- Find the flat or muscular areas (like the center of the forearm, shoulder, or calf).
- Avoid placing it over clothing or complex background.
- Adjust the scale so it's impactful but doesn't wrap awkwardly unless the design is large.
- The rotation should align with the limb or body part's axis.

RETURN ONLY A JSON OBJECT with these normalized values:
- x: Horizontal offset from center (-100 to 100). 0 is center.
- y: Vertical offset from center (-100 to 100). 0 is center.
- scale: Relative scale (0.5 to 2.5). 1.0 is standard.
- rotation: Rotation in degrees (-180 to 180).

Example: { "x": 10, "y": -20, "scale": 1.2, "rotation": 15 }`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
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
