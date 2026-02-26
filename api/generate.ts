export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { bodyPart, style, elements } = await req.json();

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: 'API Key no configurada. Contacta al administrador.' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const prompt = `Eres un consultor experto de tatuajes de élite. 
El cliente quiere un tatuaje en: ${bodyPart}
Elementos deseados: ${elements}
Estilo: ${style}

Genera EXACTAMENTE 5 propuestas de diseño de tatuaje.
Cada propuesta DEBE tener:
- "title": Título corto y atractivo (máx 4 palabras)
- "explanation": Descripción persuasiva en español que enamore al cliente (2-3 oraciones)
- "imagePrompt": Prompt CORTO en inglés para generar la imagen (máx 15 palabras). Solo keywords separadas por comas. Ejemplo: "snake, skull, roses, black ink, traditional style, tattoo flash art"

IMPORTANTE: El imagePrompt debe ser CORTO y solo contener palabras clave del diseño.
Devuelve SOLO el array JSON.`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.85,
                        responseMimeType: 'application/json',
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Gemini error:', errorBody);
            return new Response(
                JSON.stringify({ error: `Gemini API error: ${response.status}` }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const data = await response.json();
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
