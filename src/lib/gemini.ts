export interface TattooIdea {
    title: string;
    explanation: string;
    imagePrompt: string;
    imageUrl?: string; // Will be populated after image generation
}

export async function generateTattooIdeas({
    bodyPart,
    style,
    elements,
}: {
    bodyPart: string;
    style: string;
    elements: string;
}): Promise<TattooIdea[]> {
    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bodyPart, style, elements }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown' }));
        throw new Error(err.error || `API error ${response.status}`);
    }

    const data = await response.json();
    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResult) {
        throw new Error('No se obtuvo respuesta de la IA');
    }

    const ideas = JSON.parse(textResult) as TattooIdea[];
    if (!Array.isArray(ideas) || ideas.length === 0) {
        throw new Error('La IA no generó ideas válidas');
    }

    return ideas;
}

export async function generateImage(prompt: string): Promise<string> {
    const response = await fetch('/api/imagine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
        throw new Error('Error generando imagen');
    }

    const data = await response.json();
    return data.imageUrl;
}
