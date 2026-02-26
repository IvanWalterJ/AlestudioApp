import { useState, useEffect } from 'react';
import type { TattooIdea } from '../lib/gemini';
import { generateImage } from '../lib/gemini';

interface IdeasProps {
    ideas: TattooIdea[];
    onSelect: (idea: TattooIdea) => void;
    onBack: () => void;
}

export default function Ideas({ ideas, onSelect, onBack }: IdeasProps) {
    // Track image loading states per idea
    const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
    const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({});
    const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

    // Start generating images for all ideas on mount
    useEffect(() => {
        ideas.forEach((idea, index) => {
            if (!imageUrls[index] && !imageLoading[index]) {
                setImageLoading((prev) => ({ ...prev, [index]: true }));
                generateImage(idea.imagePrompt)
                    .then((url) => {
                        setImageUrls((prev) => ({ ...prev, [index]: url }));
                        setImageLoading((prev) => ({ ...prev, [index]: false }));
                    })
                    .catch(() => {
                        setImageErrors((prev) => ({ ...prev, [index]: true }));
                        setImageLoading((prev) => ({ ...prev, [index]: false }));
                    });
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-[#050505] text-[#F2F2F2] pb-40">
            <header className="px-6 pt-10 pb-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#C6A87C] mb-1">
                            Paso 2 de 2
                        </span>
                        <p className="text-2xl font-bold tracking-tight text-white">Tus Diseños</p>
                    </div>
                    <button
                        onClick={onBack}
                        className="w-10 h-10 rounded-full bg-[#1F1F1F] border border-white/10 flex items-center justify-center hover:bg-white/10 transition"
                    >
                        <span className="material-symbols-outlined text-xl text-white">close</span>
                    </button>
                </div>
                <p className="text-[#888888] text-sm">
                    La IA ha creado 5 propuestas basadas en tu estilo. Las imágenes se generan en tiempo real.
                </p>
            </header>

            <main className="px-6 flex-1 space-y-6">
                {ideas.map((idea, index) => (
                    <div
                        key={index}
                        className="relative group bg-[#141414] border border-white/5 overflow-hidden rounded-[28px] shadow-lg flex flex-col"
                    >
                        {/* Image area */}
                        <div className="relative h-64 w-full bg-[#0a0a0a] flex items-center justify-center">
                            {imageLoading[index] && (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-10 h-10 border-t-2 border-r-2 border-[#C6A87C] rounded-full animate-spin"></div>
                                    <span className="text-xs text-[#888888] uppercase tracking-widest">
                                        Generando imagen...
                                    </span>
                                </div>
                            )}
                            {imageErrors[index] && !imageLoading[index] && (
                                <div className="flex flex-col items-center gap-3">
                                    <span className="material-symbols-outlined text-3xl text-[#888888]">image</span>
                                    <span className="text-xs text-[#888888]">Imagen no disponible</span>
                                    <button
                                        onClick={() => {
                                            setImageErrors((prev) => ({ ...prev, [index]: false }));
                                            setImageLoading((prev) => ({ ...prev, [index]: true }));
                                            generateImage(idea.imagePrompt)
                                                .then((url) => {
                                                    setImageUrls((prev) => ({ ...prev, [index]: url }));
                                                    setImageLoading((prev) => ({ ...prev, [index]: false }));
                                                })
                                                .catch(() => {
                                                    setImageErrors((prev) => ({ ...prev, [index]: true }));
                                                    setImageLoading((prev) => ({ ...prev, [index]: false }));
                                                });
                                        }}
                                        className="text-[#C6A87C] text-xs underline"
                                    >
                                        Reintentar
                                    </button>
                                </div>
                            )}
                            {imageUrls[index] && !imageLoading[index] && (
                                <img
                                    alt={idea.title}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                                    src={imageUrls[index]}
                                    crossOrigin="anonymous"
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent"></div>

                            <div className="absolute bottom-5 left-5 right-5 z-10">
                                <span className="text-[10px] font-bold tracking-widest uppercase text-[#C6A87C] mb-1.5 block">
                                    Opción {index + 1}
                                </span>
                                <h2 className="text-xl font-bold text-white leading-tight">{idea.title}</h2>
                            </div>
                        </div>

                        <div className="p-5 flex flex-col flex-1">
                            <p className="text-sm text-[#888888] leading-relaxed mb-6 font-medium">
                                {idea.explanation}
                            </p>

                            <button
                                onClick={() => onSelect({ ...idea, imageUrl: imageUrls[index] })}
                                disabled={!imageUrls[index]}
                                className="mt-auto w-full border border-[#C6A87C]/50 hover:border-[#C6A87C] text-[#C6A87C] bg-[#C6A87C]/5 h-12 rounded-full font-bold text-[13px] flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <span>{imageUrls[index] ? 'PROBAR EN MI PIEL' : 'ESPERANDO IMAGEN...'}</span>
                                <span className="material-symbols-outlined text-lg">pan_tool</span>
                            </button>
                        </div>
                    </div>
                ))}
            </main>
        </div>
    );
}
