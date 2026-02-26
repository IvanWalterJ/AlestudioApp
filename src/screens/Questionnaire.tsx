import { useState } from 'react';
import { generateTattooIdeas } from '../lib/gemini';
import type { TattooIdea } from '../lib/gemini';

interface QuestionnaireProps {
    onGenerate: (ideas: TattooIdea[]) => void;
    onLoading: () => void;
}

export default function Questionnaire({ onGenerate, onLoading }: QuestionnaireProps) {
    const [bodyPart, setBodyPart] = useState('Brazo');
    const [elements, setElements] = useState('');
    const [style, setStyle] = useState('Realismo');
    const [error, setError] = useState('');

    const bodyParts = [
        { name: 'Brazo', icon: '💪' },
        { name: 'Pierna', icon: '🦵' },
        { name: 'Pecho', icon: '🫁' },
        { name: 'Espalda', icon: '🔙' },
        { name: 'Cuello', icon: '🎗️' },
        { name: 'Mano', icon: '✋' },
    ];

    const stylesList = [
        { name: 'Realismo', icon: '📸', desc: 'Fotorrealista' },
        { name: 'Tradicional', icon: '⚓', desc: 'Old School' },
        { name: 'Neo-Trad', icon: '🌹', desc: 'Moderno vibrante' },
        { name: 'Geométrico', icon: '🔷', desc: 'Patrones y formas' },
        { name: 'Blackwork', icon: '⬛', desc: 'Negro sólido' },
        { name: 'Acuarela', icon: '🎨', desc: 'Salpicaduras de color' },
    ];

    const handleSubmit = async () => {
        if (!elements.trim()) {
            setError('Por favor describe los elementos que deseas.');
            return;
        }
        setError('');
        onLoading();

        try {
            const ideas = await generateTattooIdeas({
                bodyPart,
                elements,
                style,
            });
            onGenerate(ideas);
        } catch (err) {
            console.error(err);
            alert('Error al generar ideas. Intenta de nuevo.');
            window.location.reload();
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-[#F2F2F2] font-body relative overflow-x-hidden max-w-md mx-auto flex flex-col pt-12 pb-32">
            <header className="px-6 mb-8">
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#C6A87C] mb-1 block">
                    Paso 1 de 2
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-white">Descubrimiento</h1>
                <p className="text-[#666] text-sm mt-2">
                    Cuéntanos tu visión y la IA creará opciones personalizadas.
                </p>
            </header>

            <main className="px-6 flex-1 space-y-8">
                {/* Body Part */}
                <section>
                    <h2 className="text-[13px] font-bold text-[#666] uppercase tracking-wider mb-4">
                        ¿Dónde va el tatuaje?
                    </h2>
                    <div className="grid grid-cols-3 gap-3">
                        {bodyParts.map((part) => (
                            <button
                                key={part.name}
                                onClick={() => setBodyPart(part.name)}
                                className={`py-4 px-2 rounded-[20px] text-center transition-all duration-300 border ${bodyPart === part.name
                                        ? 'border-[#C6A87C] text-[#C6A87C] bg-[#C6A87C]/10 shadow-[0_0_12px_rgba(198,168,124,0.15)]'
                                        : 'border-white/5 bg-[#111] text-[#888] hover:border-white/20'
                                    }`}
                            >
                                <span className="text-2xl block mb-1">{part.icon}</span>
                                <span className="text-[12px] font-semibold">{part.name}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Elements */}
                <section>
                    <h2 className="text-[13px] font-bold text-[#666] uppercase tracking-wider mb-4">
                        ¿Qué quieres incluir?
                    </h2>
                    <textarea
                        value={elements}
                        onChange={(e) => {
                            setElements(e.target.value);
                            if (error) setError('');
                        }}
                        placeholder="Ej. Un lobo aullando a la luna con montañas de fondo y un bosque de pinos..."
                        className="w-full h-28 bg-[#111] border border-white/5 rounded-[20px] p-5 text-sm text-white placeholder:text-[#555] focus:border-[#C6A87C] focus:ring-1 focus:ring-[#C6A87C] outline-none resize-none transition-all"
                    />
                    {error && (
                        <p className="text-red-400 text-xs mt-2 ml-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">error</span>
                            {error}
                        </p>
                    )}
                </section>

                {/* Style selection */}
                <section>
                    <h2 className="text-[13px] font-bold text-[#666] uppercase tracking-wider mb-4">
                        Estilo Preferido
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        {stylesList.map((s) => (
                            <button
                                key={s.name}
                                onClick={() => setStyle(s.name)}
                                className={`relative h-24 rounded-[20px] overflow-hidden group border-2 transition-all duration-300 flex flex-col items-center justify-center gap-1 ${style === s.name
                                        ? 'border-[#C6A87C] bg-[#C6A87C]/10 shadow-[0_0_20px_rgba(198,168,124,0.2)]'
                                        : 'border-white/5 bg-[#111] hover:border-white/15'
                                    }`}
                            >
                                <span className="text-3xl">{s.icon}</span>
                                <span
                                    className={`text-[13px] font-bold tracking-wide ${style === s.name ? 'text-[#C6A87C]' : 'text-white'
                                        }`}
                                >
                                    {s.name}
                                </span>
                                <span className="text-[10px] text-[#666]">{s.desc}</span>
                            </button>
                        ))}
                    </div>
                </section>
            </main>

            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md h-32 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent pointer-events-none z-40"></div>

            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-[340px] z-50">
                <button
                    onClick={handleSubmit}
                    className="w-full bg-[#C6A87C] text-[#050505] h-14 rounded-full font-bold text-[14px] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-[0_4px_20px_rgba(198,168,124,0.25)]"
                >
                    <span>GENERAR DISEÑOS</span>
                    <span className="material-symbols-outlined text-xl">auto_awesome</span>
                </button>
            </div>
        </div>
    );
}
