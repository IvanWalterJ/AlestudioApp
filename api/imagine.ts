export const config = {
    runtime: 'edge',
    maxDuration: 60,
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { prompt } = await req.json();
        if (!prompt) {
            return new Response(JSON.stringify({ error: 'Missing prompt' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Step 1: Submit generation request to AI Horde (free, no key needed)
        const submitRes = await fetch('https://stablehorde.net/api/v2/generate/async', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: '0000000000',
            },
            body: JSON.stringify({
                prompt: prompt + ' ### tattoo flash art, isolated on white background, high contrast, clean lines, professional',
                params: {
                    width: 512,
                    height: 512,
                    steps: 25,
                    cfg_scale: 7.5,
                    sampler_name: 'k_euler_a',
                },
                nsfw: false,
                censor_nsfw: true,
                r2: true,
            }),
        });

        if (!submitRes.ok) {
            throw new Error('Failed to submit to AI Horde');
        }

        const { id } = await submitRes.json();

        // Step 2: Poll for completion (max ~45 seconds)
        let imageUrl = '';
        for (let i = 0; i < 30; i++) {
            await new Promise((r) => setTimeout(r, 1500));

            const checkRes = await fetch(`https://stablehorde.net/api/v2/generate/check/${id}`);
            const checkData = await checkRes.json();

            if (checkData.done) {
                const statusRes = await fetch(`https://stablehorde.net/api/v2/generate/status/${id}`);
                const statusData = await statusRes.json();
                if (statusData.generations?.[0]?.img) {
                    imageUrl = statusData.generations[0].img;
                }
                break;
            }

            if (!checkData.is_possible) {
                throw new Error('Generation not possible');
            }
        }

        if (!imageUrl) {
            throw new Error('Image generation timed out');
        }

        return new Response(JSON.stringify({ imageUrl }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
