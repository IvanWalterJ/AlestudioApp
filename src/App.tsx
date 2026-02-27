import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Sparkles, ArrowRight, CheckCircle2, Upload, Camera, X, RefreshCw, SlidersHorizontal, Download, Eraser, Move, Undo, Redo, Calendar, Crown } from 'lucide-react';
import { generateConcepts, generateTattooImage, generateFinalTryOn } from './services/ai';
import type { TattooFormData, TattooConcept } from './types';

type Point = { x: number, y: number };
type Stroke = Point[];

type StudioState = {
  pos: { x: number, y: number };
  scale: number;
  rotation: number;
  opacity: number;
  strokes: Stroke[];
};

export default function App() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [formData, setFormData] = useState<TattooFormData>({
    style: 'Blackwork',
    meaning: '',
    bodyPart: 'Antebrazo',
    size: 'Mediano (10-15cm)'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [concepts, setConcepts] = useState<TattooConcept[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<TattooConcept | null>(null);
  
  // Try-On State
  const [bodyImage, setBodyImage] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pro Studio State
  const [studioMode, setStudioMode] = useState<'move' | 'erase'>('move');
  const [tattooPos, setTattooPos] = useState({ x: 0, y: 0 });
  const [tattooScale, setTattooScale] = useState(1);
  const [tattooRotation, setTattooRotation] = useState(0);
  const [tattooOpacity, setTattooOpacity] = useState(1.0);
  const [eraserSize, setEraserSize] = useState(25);
  
  const [eraserStrokes, setEraserStrokes] = useState<Stroke[]>([]);
  const currentStroke = useRef<Stroke>([]);
  const isDragging = useRef(false);
  const isErasing = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const tattooImageRef = useRef<HTMLImageElement | null>(null);

  // History State
  const [history, setHistory] = useState<StudioState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const currentStateRef = useRef<StudioState>({
    pos: { x: 0, y: 0 },
    scale: 1,
    rotation: 0,
    opacity: 1.0,
    strokes: []
  });

  useEffect(() => {
    currentStateRef.current = {
      pos: tattooPos,
      scale: tattooScale,
      rotation: tattooRotation,
      opacity: tattooOpacity,
      strokes: eraserStrokes
    };
  }, [tattooPos, tattooScale, tattooRotation, tattooOpacity, eraserStrokes]);

  useEffect(() => {
    if (step === 4 && selectedConcept) {
      const initialState = {
        pos: { x: 0, y: 0 },
        scale: 1,
        rotation: 0,
        opacity: 1.0,
        strokes: []
      };
      setHistory([initialState]);
      setHistoryIndex(0);
      
      setTattooPos(initialState.pos);
      setTattooScale(initialState.scale);
      setTattooRotation(initialState.rotation);
      setTattooOpacity(initialState.opacity);
      setEraserStrokes(initialState.strokes);
      
      currentStateRef.current = initialState;
    }
  }, [step, selectedConcept]);

  const saveStateToHistory = (override?: Partial<StudioState>) => {
    const state = { ...currentStateRef.current, ...override };
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      const lastState = newHistory[newHistory.length - 1];
      if (lastState && JSON.stringify(lastState) === JSON.stringify(state)) {
        return newHistory;
      }
      newHistory.push(state);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      setTattooPos(state.pos);
      setTattooScale(state.scale);
      setTattooRotation(state.rotation);
      setTattooOpacity(state.opacity);
      setEraserStrokes(state.strokes);
      setHistoryIndex(newIndex);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      setTattooPos(state.pos);
      setTattooScale(state.scale);
      setTattooRotation(state.rotation);
      setTattooOpacity(state.opacity);
      setEraserStrokes(state.strokes);
      setHistoryIndex(newIndex);
    }
  };

  // Final Result State
  const [isGeneratingFinal, setIsGeneratingFinal] = useState(false);
  const [finalTryOnImage, setFinalTryOnImage] = useState<string | null>(null);

  const generateImagesForConcepts = async (generatedConcepts: TattooConcept[]) => {
    const conceptsWithLoading = generatedConcepts.map(c => ({ 
      ...c, 
      imageUrl: undefined, 
      isGeneratingImage: true 
    }));
    setConcepts(conceptsWithLoading);

    for (let i = 0; i < generatedConcepts.length; i++) {
      try {
        const imageUrl = await generateTattooImage(generatedConcepts[i].technicalPrompt, formData.style);
        setConcepts(prev => prev.map((c, index) => 
          index === i ? { ...c, imageUrl, isGeneratingImage: false } : c
        ));
      } catch (error) {
        console.error(`Error generating image for concept ${i}:`, error);
        setConcepts(prev => prev.map((c, index) => 
          index === i ? { ...c, isGeneratingImage: false } : c
        ));
      }
    }
  };

  const handleGenerateConcepts = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.meaning) return;
    setIsGenerating(true);
    setStep(2);
    try {
      const generatedConcepts = await generateConcepts(formData);
      await generateImagesForConcepts(generatedConcepts);
    } catch (error) {
      console.error(error);
      alert("Hubo un error al generar los conceptos. Por favor, intenta de nuevo.");
      setStep(1);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateStyle = async (conceptIndex: number) => {
    const concept = concepts[conceptIndex];
    if (!concept) return;

    setConcepts(prev => prev.map((c, i) => 
      i === conceptIndex ? { ...c, isGeneratingImage: true } : c
    ));

    try {
      const imageUrl = await generateTattooImage(concept.technicalPrompt, formData.style);
      setConcepts(prev => prev.map((c, i) => 
        i === conceptIndex ? { ...c, imageUrl, isGeneratingImage: false } : c
      ));
    } catch (error) {
      console.error(error);
      alert("Error al regenerar el diseño.");
      setConcepts(prev => prev.map((c, i) => 
        i === conceptIndex ? { ...c, isGeneratingImage: false } : c
      ));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBodyImage(e.target?.result as string);
        setStep(4);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("No se pudo acceder a la cámara.");
      setIsCameraOpen(false);
    }
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        setBodyImage(canvas.toDataURL('image/jpeg'));
        
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
        setIsCameraOpen(false);
        setStep(4);
      }
    }
  };

  // --- Pro Studio Canvas Logic ---

  useEffect(() => {
    if (selectedConcept?.imageUrl && step === 4) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = selectedConcept.imageUrl;
      img.onload = () => {
        tattooImageRef.current = img;
        drawCanvas();
      };
    }
  }, [selectedConcept?.imageUrl, step]);

  useEffect(() => {
    drawCanvas();
  }, [tattooPos, tattooScale, tattooRotation, tattooOpacity, eraserStrokes, bodyImage]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    if (canvas.width !== container.offsetWidth || canvas.height !== container.offsetHeight) {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Tattoo Image
    if (tattooImageRef.current) {
      ctx.save();
      ctx.translate(canvas.width / 2 + tattooPos.x, canvas.height / 2 + tattooPos.y);
      ctx.rotate((tattooRotation * Math.PI) / 180);
      ctx.scale(tattooScale, tattooScale);
      ctx.globalAlpha = tattooOpacity;
      ctx.drawImage(tattooImageRef.current, -150, -150, 300, 300);
      ctx.restore();
    }

    // 2. Erase Strokes
    const drawStroke = (stroke: Stroke) => {
      if (stroke.length < 1) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    };

    if (eraserStrokes.length > 0 || currentStroke.current.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = eraserSize;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      
      eraserStrokes.forEach(drawStroke);
      if (currentStroke.current.length > 0) {
        drawStroke(currentStroke.current);
      }
      ctx.restore();
    }
  };

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    if (studioMode === 'move') {
      isDragging.current = true;
      dragStart.current = { x: e.clientX - tattooPos.x, y: e.clientY - tattooPos.y };
    } else {
      isErasing.current = true;
      currentStroke.current = [getCanvasPoint(e)];
      drawCanvas();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (studioMode === 'move' && isDragging.current) {
      setTattooPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    } else if (studioMode === 'erase' && isErasing.current) {
      currentStroke.current.push(getCanvasPoint(e));
      drawCanvas();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (studioMode === 'move') {
      if (isDragging.current) {
        isDragging.current = false;
        saveStateToHistory({ pos: { x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y } });
      }
    } else if (studioMode === 'erase' && isErasing.current) {
      isErasing.current = false;
      if (currentStroke.current.length > 0) {
        const newStrokes = [...eraserStrokes, currentStroke.current];
        setEraserStrokes(newStrokes);
        currentStroke.current = [];
        saveStateToHistory({ strokes: newStrokes });
      }
    }
  };

  const getComposedImageBase64 = async (): Promise<string | null> => {
    const container = containerRef.current;
    const tattooCanvas = canvasRef.current;
    if (!container || !tattooCanvas || !bodyImage) return null;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = container.offsetWidth;
    exportCanvas.height = container.offsetHeight;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return null;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = bodyImage;
    await new Promise(r => img.onload = r);

    const scale = Math.max(exportCanvas.width / img.width, exportCanvas.height / img.height);
    const x = (exportCanvas.width / 2) - (img.width / 2) * scale;
    const y = (exportCanvas.height / 2) - (img.height / 2) * scale;
    
    // 1. Base Body
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

    // 2. Tattoo (Multiply + Eraser strokes)
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(tattooCanvas, 0, 0);

    // 3. Skin Highlights (Screen)
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.15;
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

    return exportCanvas.toDataURL('image/jpeg', 0.9);
  };

  const handleDownload = async () => {
    const base64 = await getComposedImageBase64();
    if (!base64) return;

    const link = document.createElement('a');
    link.download = 'tattoo-studio-result.jpg';
    link.href = base64;
    link.click();
  };

  const handleGenerateFinalImage = async () => {
    const base64 = await getComposedImageBase64();
    if (!base64) return;

    setIsGeneratingFinal(true);
    setStep(5);

    try {
      const finalUrl = await generateFinalTryOn(base64);
      setFinalTryOnImage(finalUrl);
    } catch (error) {
      console.error(error);
      alert("Error al generar el resultado final realista.");
      setStep(4);
    } finally {
      setIsGeneratingFinal(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-zinc-800">
      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-8 h-8 text-zinc-100" />
            <span className="text-xl font-bold tracking-widest uppercase">AL ESTILO ESTUDIO</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-sm font-medium text-zinc-500">
            <span className={step >= 1 ? "text-zinc-50" : ""}>01. Brief</span>
            <span className="w-4 h-[1px] bg-zinc-800"></span>
            <span className={step >= 2 ? "text-zinc-50" : ""}>02. Diseño</span>
            <span className="w-4 h-[1px] bg-zinc-800"></span>
            <span className={step >= 3 ? "text-zinc-50" : ""}>03. Foto</span>
            <span className="w-4 h-[1px] bg-zinc-800"></span>
            <span className={step >= 4 ? "text-zinc-50" : ""}>04. Estudio Pro</span>
            <span className="w-4 h-[1px] bg-zinc-800"></span>
            <span className={step >= 5 ? "text-zinc-50" : ""}>05. Resultado</span>
            <span className="w-4 h-[1px] bg-zinc-800"></span>
            <span className={step >= 6 ? "text-zinc-50" : ""}>06. Agendar</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Step 1: Brief */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-5xl font-light tracking-tight mb-4">Crea tu diseño.</h1>
            <p className="text-zinc-400 text-lg mb-12 leading-relaxed">Describe tu idea, elige un estilo y deja que la IA genere conceptos únicos para tu próximo tatuaje.</p>
            
            <form onSubmit={handleGenerateConcepts} className="space-y-8 bg-zinc-900/30 p-8 rounded-3xl border border-zinc-800/50">
              <div className="space-y-3">
                <label className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Estilo del Tatuaje</label>
                <select 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-100 focus:ring-2 focus:ring-zinc-700 focus:border-transparent outline-none transition-all appearance-none"
                  value={formData.style}
                  onChange={e => setFormData({...formData, style: e.target.value})}
                >
                  <option>Blackwork</option>
                  <option>Tradicional (Old School)</option>
                  <option>Realismo</option>
                  <option>Minimalista / Fineline</option>
                  <option>Japonés (Irezumi)</option>
                  <option>Acuarela</option>
                  <option>Geométrico</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Historia o Significado</label>
                <textarea 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-100 focus:ring-2 focus:ring-zinc-700 focus:border-transparent outline-none transition-all min-h-[120px] resize-none"
                  placeholder="Ej: Quiero representar la superación de un momento difícil, como un fénix o algo relacionado con el renacer..."
                  value={formData.meaning}
                  onChange={e => setFormData({...formData, meaning: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Parte del Cuerpo</label>
                  <input 
                    type="text"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-100 focus:ring-2 focus:ring-zinc-700 focus:border-transparent outline-none transition-all"
                    placeholder="Ej: Antebrazo"
                    value={formData.bodyPart}
                    onChange={e => setFormData({...formData, bodyPart: e.target.value})}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Tamaño</label>
                  <select 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-100 focus:ring-2 focus:ring-zinc-700 focus:border-transparent outline-none transition-all appearance-none"
                    value={formData.size}
                    onChange={e => setFormData({...formData, size: e.target.value})}
                  >
                    <option>Pequeño (1-5cm)</option>
                    <option>Mediano (10-15cm)</option>
                    <option>Grande (20cm+)</option>
                    <option>Manga completa</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                disabled={!formData.meaning || isGenerating}
                className="w-full bg-zinc-100 text-zinc-950 font-medium rounded-xl p-4 flex items-center justify-center gap-2 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {isGenerating ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Generando conceptos...</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> Generar Ideas</>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Concepts & Designs */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div>
                <h1 className="text-4xl font-light tracking-tight mb-2">Elige tu diseño.</h1>
                <p className="text-zinc-400">Selecciona el concepto que más te guste para probarlo en tu piel.</p>
              </div>
              <button 
                onClick={handleGenerateConcepts}
                disabled={isGenerating}
                className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors bg-zinc-900/50 px-4 py-2 rounded-lg border border-zinc-800"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                Regenerar Ideas
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {concepts.map((concept, idx) => (
                <div key={idx} className="group bg-zinc-900/30 border border-zinc-800/50 rounded-3xl overflow-hidden hover:border-zinc-700 transition-all flex flex-col">
                  <div className="aspect-square bg-zinc-950 relative border-b border-zinc-800/50">
                    {concept.isGeneratingImage ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-3" />
                        <span className="text-sm font-medium">Creando diseño...</span>
                      </div>
                    ) : concept.imageUrl ? (
                      <img src={concept.imageUrl} alt={concept.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
                        <span className="text-sm">Error al generar imagen</span>
                      </div>
                    )}
                    
                    {/* Style Regeneration Overlay */}
                    {!concept.isGeneratingImage && concept.imageUrl && (
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleRegenerateStyle(idx)}
                          className="bg-zinc-950/80 backdrop-blur-md text-zinc-300 hover:text-white text-xs font-medium px-3 py-2 rounded-lg border border-zinc-800 flex items-center gap-2"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Probar otro estilo
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-medium mb-3">{concept.title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-6 flex-grow">{concept.narrative}</p>
                    
                    <button 
                      onClick={() => {
                        setSelectedConcept(concept);
                        setStep(3);
                      }}
                      disabled={!concept.imageUrl || concept.isGeneratingImage}
                      className="w-full bg-zinc-800 text-zinc-100 font-medium rounded-xl p-3 flex items-center justify-center gap-2 hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
                    >
                      Probar en mi piel <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Photo Upload */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setStep(2)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                ← Volver
              </button>
              <h1 className="text-4xl font-light tracking-tight">Tu lienzo.</h1>
            </div>
            <p className="text-zinc-400 text-lg mb-8">Sube una foto de tu {formData.bodyPart.toLowerCase()} para probar el diseño.</p>

            {isCameraOpen ? (
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-4 overflow-hidden relative">
                <video ref={videoRef} autoPlay playsInline className="w-full rounded-2xl bg-zinc-950" />
                <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
                  <button onClick={takePhoto} className="bg-zinc-100 text-zinc-950 rounded-full w-16 h-16 flex items-center justify-center hover:bg-white transition-colors">
                    <Camera className="w-6 h-6" />
                  </button>
                  <button onClick={() => setIsCameraOpen(false)} className="bg-zinc-800 text-zinc-100 rounded-full w-16 h-16 flex items-center justify-center hover:bg-zinc-700 transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={startCamera}
                  className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 hover:bg-zinc-900/50 transition-colors group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera className="w-8 h-8 text-zinc-400" />
                  </div>
                  <span className="font-medium text-zinc-300">Tomar foto</span>
                </button>

                <label className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 hover:bg-zinc-900/50 transition-colors cursor-pointer group">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-zinc-400" />
                  </div>
                  <span className="font-medium text-zinc-300">Subir imagen</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Pro Studio */}
        {step === 4 && (
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h1 className="text-4xl font-light tracking-tight mb-2">Estudio Pro</h1>
                <p className="text-zinc-400">Ajusta, borra los excesos y aplica realismo.</p>
              </div>
              <button 
                onClick={() => setStep(3)}
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors self-start md:self-auto"
              >
                ← Cambiar foto
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Canvas Area */}
              <div className="lg:col-span-2 bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-2 md:p-6">
                <div 
                  ref={containerRef} 
                  className="relative w-full aspect-[3/4] md:aspect-square lg:aspect-video rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800/50 shadow-2xl touch-none"
                >
                  {/* 1. Base Body Image */}
                  {bodyImage && (
                    <img 
                      src={bodyImage} 
                      alt="Body" 
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    />
                  )}

                  {/* 2. Interactive Tattoo Canvas (Multiply) */}
                  <canvas
                    ref={canvasRef}
                    className={`absolute inset-0 w-full h-full mix-blend-multiply ${studioMode === 'move' ? 'cursor-move' : 'cursor-crosshair'}`}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                  />

                  {/* 3. Skin Highlights (Screen) - Adds realism over the ink */}
                  {bodyImage && (
                    <img 
                      src={bodyImage} 
                      alt="Highlights" 
                      className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-15 pointer-events-none"
                    />
                  )}

                  {/* Instruction Overlay */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                    <div className="bg-zinc-950/80 backdrop-blur-md text-zinc-300 text-xs px-4 py-2 rounded-full border border-zinc-800 shadow-xl">
                      {studioMode === 'move' ? 'Arrastra para mover el tatuaje' : 'Dibuja sobre el tatuaje para borrar los excesos'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls Sidebar */}
              <div className="flex flex-col gap-6">
                {/* Mode Switcher & History */}
                <div className="flex items-center gap-2">
                  <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-2 flex gap-2 flex-1">
                    <button 
                      onClick={() => setStudioMode('move')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors ${studioMode === 'move' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      <Move className="w-4 h-4" /> Mover
                    </button>
                    <button 
                      onClick={() => setStudioMode('erase')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors ${studioMode === 'erase' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      <Eraser className="w-4 h-4" /> Borrar
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-2">
                    <button 
                      onClick={handleUndo} 
                      disabled={historyIndex <= 0}
                      className="p-3 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                      title="Deshacer"
                    >
                      <Undo className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={handleRedo} 
                      disabled={historyIndex >= history.length - 1}
                      className="p-3 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                      title="Rehacer"
                    >
                      <Redo className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
                  {studioMode === 'move' ? (
                    <div className="space-y-8">
                      <div className="flex items-center gap-3 mb-6">
                        <SlidersHorizontal className="w-5 h-5 text-zinc-400" />
                        <h3 className="font-medium text-zinc-100">Ajustes del Tatuaje</h3>
                      </div>

                      {/* Scale Control */}
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <label className="text-zinc-400">Tamaño</label>
                          <span className="text-zinc-500 font-mono">{Math.round(tattooScale * 100)}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0.5" 
                          max="2" 
                          step="0.05" 
                          value={tattooScale}
                          onChange={(e) => setTattooScale(parseFloat(e.target.value))}
                          onPointerUp={(e) => saveStateToHistory({ scale: parseFloat(e.currentTarget.value) })}
                          onKeyUp={(e) => saveStateToHistory({ scale: parseFloat(e.currentTarget.value) })}
                          className="w-full accent-zinc-100 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Rotation Control */}
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <label className="text-zinc-400">Rotación</label>
                          <span className="text-zinc-500 font-mono">{tattooRotation}°</span>
                        </div>
                        <input 
                          type="range" 
                          min="-180" 
                          max="180" 
                          value={tattooRotation}
                          onChange={(e) => setTattooRotation(parseInt(e.target.value))}
                          onPointerUp={(e) => saveStateToHistory({ rotation: parseInt(e.currentTarget.value) })}
                          onKeyUp={(e) => saveStateToHistory({ rotation: parseInt(e.currentTarget.value) })}
                          className="w-full accent-zinc-100 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Opacity/Fading Control */}
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <label className="text-zinc-400">Intensidad (Tinta Fresca)</label>
                          <span className="text-zinc-500 font-mono">{Math.round(tattooOpacity * 100)}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0.3" 
                          max="1" 
                          step="0.05" 
                          value={tattooOpacity}
                          onChange={(e) => setTattooOpacity(parseFloat(e.target.value))}
                          onPointerUp={(e) => saveStateToHistory({ opacity: parseFloat(e.currentTarget.value) })}
                          onKeyUp={(e) => saveStateToHistory({ opacity: parseFloat(e.currentTarget.value) })}
                          className="w-full accent-zinc-100 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        />
                        <p className="text-xs text-zinc-600">Bájalo para simular un tatuaje curado.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="flex items-center gap-3 mb-6">
                        <Eraser className="w-5 h-5 text-zinc-400" />
                        <h3 className="font-medium text-zinc-100">Borrador Mágico</h3>
                      </div>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        Pasa el cursor sobre las partes del tatuaje que se salen de tu cuerpo para borrarlas.
                      </p>

                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <label className="text-zinc-400">Tamaño del pincel</label>
                        </div>
                        <input 
                          type="range" 
                          min="5" 
                          max="80" 
                          value={eraserSize}
                          onChange={(e) => setEraserSize(parseInt(e.target.value))}
                          className="w-full accent-zinc-100 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="flex gap-3 pt-4 border-t border-zinc-800/50">
                        <button 
                          onClick={() => {
                            setEraserStrokes([]);
                            saveStateToHistory({ strokes: [] });
                          }}
                          disabled={eraserStrokes.length === 0}
                          className="w-full flex items-center justify-center gap-2 bg-red-950/30 text-red-400 py-3 rounded-xl text-sm font-medium hover:bg-red-900/40 transition-colors disabled:opacity-50"
                        >
                          Limpiar borrados
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 mt-auto">
                  <button 
                    onClick={handleDownload}
                    className="w-full bg-zinc-800 text-zinc-100 font-medium rounded-xl p-4 flex items-center justify-center gap-2 hover:bg-zinc-700 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Descargar Boceto
                  </button>

                  <button 
                    onClick={handleGenerateFinalImage}
                    className="w-full bg-zinc-100 text-zinc-950 font-medium rounded-xl p-4 flex items-center justify-center gap-2 hover:bg-white transition-colors shadow-2xl"
                  >
                    <Sparkles className="w-5 h-5" />
                    Aplicar Realismo con IA
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Final AI Result */}
        {step === 5 && (
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
              <div>
                <h1 className="text-4xl font-light tracking-tight mb-2">Resultado Final</h1>
                <p className="text-zinc-400">Tu diseño adaptado anatómicamente con IA.</p>
              </div>
              <button 
                onClick={() => setStep(4)}
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors self-start md:self-auto"
              >
                ← Volver al estudio
              </button>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-2 md:p-6">
              {isGeneratingFinal ? (
                <div className="aspect-[3/4] md:aspect-video rounded-2xl bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 border border-zinc-800/50">
                  <Loader2 className="w-10 h-10 animate-spin mb-4 text-zinc-100" />
                  <p className="font-medium text-zinc-100">Procesando realismo y física...</p>
                  <p className="text-sm mt-2 text-zinc-500">Añadiendo textura de piel y ajustando iluminación</p>
                </div>
              ) : finalTryOnImage ? (
                <div className="aspect-[3/4] md:aspect-video rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800/50 relative group">
                  <img src={finalTryOnImage} alt="Tattoo Try-On Result" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.download = 'tattoo-ai-result.jpg';
                        link.href = finalTryOnImage;
                        link.click();
                      }}
                      className="bg-zinc-100 text-zinc-950 px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-white transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      Descargar Imagen Final
                    </button>
                  </div>
                </div>
              ) : (
                <div className="aspect-[3/4] md:aspect-video rounded-2xl bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 border border-zinc-800/50">
                  <p>Error al generar la imagen.</p>
                </div>
              )}
            </div>

            {!isGeneratingFinal && finalTryOnImage && (
              <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4">
                <button 
                  onClick={() => setStep(6)}
                  className="bg-zinc-100 text-zinc-950 font-medium rounded-xl px-8 py-4 flex items-center justify-center gap-2 hover:bg-white transition-colors"
                >
                  <Calendar className="w-5 h-5" />
                  Agendar Sesión
                </button>
                <button 
                  onClick={() => {
                    setStep(1);
                    setBodyImage(null);
                    setFinalTryOnImage(null);
                    setSelectedConcept(null);
                    setTattooPos({x: 0, y: 0});
                    setTattooScale(1);
                    setTattooRotation(0);
                    setEraserStrokes([]);
                    setFormData({ ...formData, meaning: '' });
                  }}
                  className="bg-zinc-800 text-zinc-100 font-medium rounded-xl px-8 py-4 flex items-center justify-center gap-2 hover:bg-zinc-700 transition-colors"
                >
                  Crear otro tatuaje
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 6: Booking */}
        {step === 6 && (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
              <div>
                <h1 className="text-4xl font-light tracking-tight mb-2">Reserva tu cita.</h1>
                <p className="text-zinc-400">Elige el día y la hora para hacer realidad tu diseño en Al Estilo Estudio.</p>
              </div>
              <button 
                onClick={() => setStep(5)}
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors self-start md:self-auto"
              >
                ← Volver al resultado
              </button>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-2 md:p-6 overflow-hidden">
              {/* Cal.com embed iframe */}
              <iframe 
                src="https://cal.com/team/calcom/30min?embed=true&theme=dark" 
                className="w-full h-[700px] border-0 rounded-2xl bg-zinc-950"
                title="Agendar Sesión"
              ></iframe>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
