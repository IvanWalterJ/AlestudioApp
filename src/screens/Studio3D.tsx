import { useState, useRef, useCallback } from 'react';
import { Camera, Download, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import type { TattooIdea } from '../lib/gemini';

interface Studio3DProps {
    idea?: TattooIdea;
    onBack: () => void;
}

export default function Studio3D({ idea, onBack }: Studio3DProps) {
    const [skinImage, setSkinImage] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const skinInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Drag state for the tattoo overlay
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [tattooScale, setTattooScale] = useState(0.5);

    const tattooUrl = idea?.imageUrl || null;

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setSkinImage(url);
            // Reset position when a new image is uploaded
            setPosition({ x: 0, y: 0 });
        }
    };

    // Save the composite result
    const handleSave = useCallback(async () => {
        if (!skinImage || !tattooUrl || !containerRef.current) return;
        setSaving(true);

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas not supported');

            // Load skin image
            const skinImg = new Image();
            skinImg.crossOrigin = 'anonymous';
            await new Promise<void>((resolve, reject) => {
                skinImg.onload = () => resolve();
                skinImg.onerror = reject;
                skinImg.src = skinImage;
            });

            canvas.width = skinImg.naturalWidth;
            canvas.height = skinImg.naturalHeight;

            // Draw skin
            ctx.drawImage(skinImg, 0, 0);

            // Load tattoo image
            const tatImg = new Image();
            tatImg.crossOrigin = 'anonymous';
            await new Promise<void>((resolve, reject) => {
                tatImg.onload = () => resolve();
                tatImg.onerror = reject;
                tatImg.src = tattooUrl;
            });

            // Calculate tattoo position relative to canvas
            const container = containerRef.current;
            const displayW = container.clientWidth;
            const displayH = container.clientHeight;
            const scaleX = canvas.width / displayW;
            const scaleY = canvas.height / displayH;

            const tattooDisplayW = displayW * tattooScale;
            const tattooDisplayH = (tatImg.naturalHeight / tatImg.naturalWidth) * tattooDisplayW;

            const tatX = (displayW / 2 + position.x - tattooDisplayW / 2) * scaleX;
            const tatY = (displayH / 2 + position.y - tattooDisplayH / 2) * scaleY;
            const tatW = tattooDisplayW * scaleX;
            const tatH = tattooDisplayH * scaleY;

            // Apply blend
            ctx.globalAlpha = 0.82;
            ctx.globalCompositeOperation = 'multiply';
            ctx.filter = 'blur(0.5px) contrast(1.3) grayscale(0.2)';
            ctx.drawImage(tatImg, tatX, tatY, tatW, tatH);

            // Download
            const link = document.createElement('a');
            link.download = `tattoo-preview-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Save error:', err);
            alert('Error al guardar. Intenta de nuevo.');
        } finally {
            setSaving(false);
        }
    }, [skinImage, tattooUrl, position, tattooScale]);

    return (
        <div className="min-h-screen bg-[#050505] text-[#F2F2F2] flex flex-col items-center p-4 pb-24 relative overflow-hidden font-body">
            {/* Header */}
            <header className="w-full max-w-2xl flex justify-between items-center mb-6 relative z-10 px-2 pt-4">
                <button
                    onClick={onBack}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 active:scale-95 transition-transform"
                >
                    <span className="material-symbols-outlined text-[20px]">arrow_back_ios_new</span>
                </button>
                <div className="text-center flex-1">
                    <h1 className="text-[17px] font-semibold tracking-tight">Lienzo Corporal</h1>
                    <p className="text-[11px] text-[#888888] font-medium uppercase tracking-[0.15em] mt-0.5">
                        {idea ? idea.title : 'Vista Previa'}
                    </p>
                </div>
                <button
                    onClick={() => {
                        setSkinImage(null);
                        setPosition({ x: 0, y: 0 });
                    }}
                    className="text-[#888888] hover:text-[#C6A87C] transition-colors"
                >
                    <RotateCcw size={20} />
                </button>
            </header>

            {/* Main Studio Area */}
            <main className="w-full max-w-2xl flex flex-col gap-6 relative z-10 flex-grow">
                {/* Canvas Area */}
                <div
                    ref={containerRef}
                    className="flex-grow bg-[#141414] border border-white/10 rounded-[32px] relative overflow-hidden min-h-[60vh] flex items-center justify-center shadow-2xl"
                >
                    {!skinImage ? (
                        <div className="text-center p-8">
                            <Camera size={48} className="mx-auto text-[#555] mb-4" strokeWidth={1} />
                            <h2 className="text-xl font-medium mb-2">Sube tu lienzo</h2>
                            <p className="text-[#888888] text-sm mb-8 max-w-xs mx-auto">
                                Fotografía la zona de tu cuerpo donde irá el tatuaje. La IA posicionará el diseño automáticamente.
                            </p>

                            <div className="flex flex-col gap-3 items-center">
                                <button
                                    onClick={() => {
                                        if (skinInputRef.current) {
                                            skinInputRef.current.removeAttribute('capture');
                                            skinInputRef.current.click();
                                        }
                                    }}
                                    className="bg-transparent border border-[#C6A87C] text-[#C6A87C] font-bold px-8 py-4 rounded-full uppercase tracking-wider text-[13px] hover:bg-[#C6A87C] hover:text-black transition-colors w-52"
                                >
                                    Subir Foto
                                </button>
                                <button
                                    onClick={() => {
                                        if (skinInputRef.current) {
                                            skinInputRef.current.setAttribute('capture', 'environment');
                                            skinInputRef.current.click();
                                        }
                                    }}
                                    className="bg-[#C6A87C] text-black font-bold px-8 py-4 rounded-full uppercase tracking-wider text-[13px] hover:bg-white transition-colors shadow-[0_4px_20px_rgba(198,168,124,0.3)] w-52"
                                >
                                    Tomar Foto
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
                            {/* Skin Background */}
                            <img
                                src={skinImage}
                                alt="Skin Canvas"
                                className="w-full h-full object-contain"
                            />

                            {/* Tattoo Overlay - draggable */}
                            {tattooUrl && (
                                <motion.div
                                    drag
                                    dragMomentum={false}
                                    onDragEnd={(_e, info) => {
                                        setPosition((prev) => ({
                                            x: prev.x + info.offset.x,
                                            y: prev.y + info.offset.y,
                                        }));
                                    }}
                                    className="absolute z-10 cursor-move"
                                    style={{
                                        x: position.x,
                                        y: position.y,
                                        width: `${tattooScale * 100}%`,
                                        opacity: 0.82,
                                        filter: 'blur(0.3px) contrast(1.25) grayscale(0.15)',
                                        mixBlendMode: 'multiply',
                                    }}
                                >
                                    <img
                                        src={tattooUrl}
                                        alt="Tattoo"
                                        className="w-full h-auto pointer-events-none"
                                        crossOrigin="anonymous"
                                    />
                                </motion.div>
                            )}
                        </div>
                    )}
                </div>

                {/* Simple controls below canvas — only when skin is loaded */}
                {skinImage && tattooUrl && (
                    <div className="flex flex-col gap-4">
                        {/* Size slider */}
                        <div className="bg-[#141414] border border-white/10 rounded-[20px] p-5">
                            <div className="flex justify-between text-[11px] font-mono text-[#888888] uppercase tracking-wider mb-3">
                                <span>Tamaño del tatuaje</span>
                                <span className="text-[#C6A87C]">{Math.round(tattooScale * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min={0.15}
                                max={0.9}
                                step={0.01}
                                value={tattooScale}
                                onChange={(e) => setTattooScale(parseFloat(e.target.value))}
                                className="w-full h-1 bg-[#1F1F1F] rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[#C6A87C] [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                            />
                            <p className="text-[#555] text-[11px] mt-3">Arrastra el diseño sobre tu piel para posicionarlo</p>
                        </div>

                        {/* Save button */}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full bg-[#C6A87C] text-black h-14 rounded-full font-bold uppercase tracking-wider text-[13px] hover:bg-white transition-colors shadow-[0_0_20px_rgba(198,168,124,0.3)] flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <div className="w-5 h-5 border-t-2 border-black rounded-full animate-spin"></div>
                                    <span>Guardando...</span>
                                </>
                            ) : (
                                <>
                                    <Download size={18} />
                                    <span>Guardar Resultado</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </main>

            {/* Hidden input */}
            <input
                type="file"
                accept="image/*"
                ref={skinInputRef}
                onChange={handleImageUpload}
                className="hidden"
            />
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
