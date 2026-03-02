// Vercel trigger: update env vars
import React, { useState, useRef, useEffect } from 'react';

import { Loader2, Sparkles, ArrowRight, CheckCircle2, Upload, Camera, X, RefreshCw, SlidersHorizontal, Download, Eraser, Move, Undo, Redo, Calendar, Crown, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

const LoadingInkAnimation = ({ label, subLabel }: { label: string, subLabel?: string }) => (
  <div className="flex flex-col items-center justify-center gap-6 py-8">
    <div className="relative w-24 h-24">
      <svg className="absolute inset-0 w-full h-full drop-shadow-2xl" viewBox="0 0 100 100">
        <defs>
          <filter id="ink-blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
          </filter>
        </defs>
        <g filter="url(#ink-blur)" className="text-zinc-400">
          <motion.circle cx="50" cy="50" r="18" fill="currentColor"
            animate={{ scale: [1, 1.4, 0.9, 1.3, 1], y: [0, -12, 8, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle cx="50" cy="50" r="14" fill="currentColor"
            animate={{ scale: [1, 1.8, 0.6, 1.4, 1], x: [0, 15, -12, 10, 0], y: [0, -18, 6, -8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle cx="50" cy="50" r="10" fill="currentColor"
            animate={{ scale: [0.6, 1.5, 2, 0.8, 0.6], x: [0, -15, 8, -12, 0], y: [0, 15, -20, 12, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </g>
      </svg>
      <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-zinc-100 animate-spin z-10" />
    </div>
    <div className="text-center">
      <p className="font-medium text-zinc-100 text-lg tracking-wide">{label}</p>
      {subLabel && <p className="text-sm mt-2 text-zinc-500">{subLabel}</p>}
    </div>
  </div>
);

export default function App() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [formData, setFormData] = useState<TattooFormData>({
    style: 'Blackwork',
    meaning: '',
    bodyPart: 'Antebrazo',
    referenceImage: null
  });
  const [designHistory, setDesignHistory] = useState<TattooConcept[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [concepts, setConcepts] = useState<TattooConcept[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<TattooConcept | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // Touch Gesture Refs
  const pointers = useRef<Map<number, Point>>(new Map());
  const initialPinchDist = useRef<number | null>(null);
  const initialPinchScale = useRef<number | null>(null);
  const initialPinchAngle = useRef<number | null>(null);
  const initialPinchRotation = useRef<number | null>(null);

  const tattooImageRef = useRef<HTMLImageElement | null>(null);
  const [tattooImageLoaded, setTattooImageLoaded] = useState(false);

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
    // Force draw after state updates
    drawCanvas();
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
      // Add new results to history
      setDesignHistory(prev => [...generatedConcepts, ...prev]);
    } catch (error: any) {
      console.error(error);
      const msg = error?.status === 503 || error?.message?.includes('503')
        ? "Hay mucha demanda en la app en este momento. ¡Nuestros artistas digitales están a tope! Por favor, volvé a intentarlo en unos segundos."
        : "Hubo un problema al conectar con el estudio. Por favor, intenta de nuevo.";
      setErrorMessage(msg);
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
    } catch (error: any) {
      console.error(error);
      const msg = error?.status === 503 || error?.message?.includes('503')
        ? "IA saturada. Hay muchísima gente diseñando ahora mismo, por favor reintentá en un momento."
        : "Error al regenerar el diseño.";
      setErrorMessage(msg);
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
      setErrorMessage("No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios.");
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
      setTattooImageLoaded(false);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = selectedConcept.imageUrl;
      img.onload = () => {
        tattooImageRef.current = img;
        setTattooImageLoaded(true);
      };
    }
  }, [selectedConcept?.imageUrl, step]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      drawCanvas();
    });

    resizeObserver.observe(container);

    // Immediate draw on enter step 4
    if (step === 4) {
      setTimeout(() => {
        drawCanvas();
      }, 50);
    }

    return () => resizeObserver.disconnect();
  }, [step, tattooImageLoaded]);

  useEffect(() => {
    // Small delay to ensure container dimensions are set before drawing
    const timer = setTimeout(() => {
      drawCanvas();
    }, 100);
    return () => clearTimeout(timer);
  }, [step, tattooPos, tattooScale, tattooRotation, tattooOpacity, eraserStrokes, bodyImage, tattooImageLoaded]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || container.offsetWidth === 0) return;

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
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.current.size === 1) {
        isDragging.current = true;
        dragStart.current = { x: e.clientX - tattooPos.x, y: e.clientY - tattooPos.y };
      } else if (pointers.current.size === 2) {
        isDragging.current = false;
        const pts = Array.from(pointers.current.values()) as Point[];
        const dx = pts[0].x - pts[1].x;
        const dy = pts[0].y - pts[1].y;
        initialPinchDist.current = Math.hypot(dx, dy);
        initialPinchScale.current = tattooScale;
        initialPinchAngle.current = Math.atan2(dy, dx) * 180 / Math.PI;
        initialPinchRotation.current = tattooRotation;
      }
    } else {
      isErasing.current = true;
      currentStroke.current = [getCanvasPoint(e)];
      drawCanvas();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (studioMode === 'move') {
      if (pointers.current.has(e.pointerId)) {
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      if (pointers.current.size === 1 && isDragging.current) {
        setTattooPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
      } else if (pointers.current.size === 2 && initialPinchDist.current !== null && initialPinchScale.current !== null && initialPinchAngle.current !== null && initialPinchRotation.current !== null) {
        const pts = Array.from(pointers.current.values()) as Point[];
        const dx = pts[0].x - pts[1].x;
        const dy = pts[0].y - pts[1].y;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        const scaleDiff = dist / initialPinchDist.current;
        const newScale = Math.max(0.1, Math.min(5, initialPinchScale.current * scaleDiff));

        let angleDiff = angle - initialPinchAngle.current;
        if (angleDiff > 180) angleDiff -= 360;
        if (angleDiff < -180) angleDiff += 360;

        let newRotation = initialPinchRotation.current + angleDiff;

        setTattooScale(newScale);
        setTattooRotation(newRotation);
      }
    } else if (studioMode === 'erase' && isErasing.current) {
      currentStroke.current.push(getCanvasPoint(e));
      drawCanvas();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (studioMode === 'move') {
      pointers.current.delete(e.pointerId);

      if (pointers.current.size === 0) {
        if (isDragging.current || initialPinchDist.current !== null) {
          isDragging.current = false;
          initialPinchDist.current = null;
          initialPinchScale.current = null;
          initialPinchAngle.current = null;
          initialPinchRotation.current = null;
          saveStateToHistory({ pos: tattooPos, scale: tattooScale, rotation: tattooRotation });
        }
      } else if (pointers.current.size === 1) {
        const remainingPtr = (Array.from(pointers.current.values()) as Point[])[0];
        isDragging.current = true;
        dragStart.current = { x: remainingPtr.x - tattooPos.x, y: remainingPtr.y - tattooPos.y };
        initialPinchDist.current = null;
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
    if (!container || !bodyImage) return null;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = bodyImage;
    await new Promise(r => img.onload = r);

    // Use original image dimensions for export
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = img.width;
    exportCanvas.height = img.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return null;

    // Calculate scaling ratio between container and original image
    const containerRatio = container.offsetWidth / container.offsetHeight;
    const imgRatio = img.width / img.height;

    let renderWidth, renderHeight, offsetX, offsetY;
    if (imgRatio > containerRatio) {
      renderHeight = img.height;
      renderWidth = img.height * containerRatio;
      offsetX = (img.width - renderWidth) / 2;
      offsetY = 0;
    } else {
      renderWidth = img.width;
      renderHeight = img.width / containerRatio;
      offsetX = 0;
      offsetY = (img.height - renderHeight) / 2;
    }

    const scaleFactor = renderWidth / container.offsetWidth;

    // 1. Draw Base Body (cropped to match container's object-cover)
    ctx.drawImage(img, offsetX, offsetY, renderWidth, renderHeight, 0, 0, exportCanvas.width, exportCanvas.height);

    // 2. Draw Tattoo at high resolution
    if (tattooImageRef.current) {
      ctx.save();
      // Position relative to center of export canvas
      const centerX = exportCanvas.width / 2 + tattooPos.x * scaleFactor;
      const centerY = exportCanvas.height / 2 + tattooPos.y * scaleFactor;
      ctx.translate(centerX, centerY);
      ctx.rotate((tattooRotation * Math.PI) / 180);
      ctx.scale(tattooScale * scaleFactor, tattooScale * scaleFactor);

      // Apply multiply blend mode for the tattoo
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = tattooOpacity;
      // The original drawing uses -150, -150 as origin for the 300x300 image
      ctx.drawImage(tattooImageRef.current, -150, -150, 300, 300);
      ctx.restore();
    }

    // 3. Apply eraser strokes at high resolution
    if (eraserStrokes.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = eraserSize * scaleFactor;
      ctx.strokeStyle = 'rgba(0,0,0,1)';

      eraserStrokes.forEach(stroke => {
        if (stroke.length < 1) return;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x * scaleFactor, stroke[0].y * scaleFactor);
        for (let i = 1; i < stroke.length; i++) {
          ctx.lineTo(stroke[i].x * scaleFactor, stroke[i].y * scaleFactor);
        }
        ctx.stroke();
      });
      ctx.restore();
    }

    // 4. Skin Highlights (Screen) for realism
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.2; // Slightly higher for high-res
    ctx.drawImage(img, offsetX, offsetY, renderWidth, renderHeight, 0, 0, exportCanvas.width, exportCanvas.height);
    ctx.restore();

    return exportCanvas.toDataURL('image/jpeg', 0.95); // High quality JPEG
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
    } catch (error: any) {
      console.error(error);
      const msg = error?.status === 503 || error?.message?.includes('503')
        ? "El motor de realismo está saturado por la alta demanda. Intentá aplicarlo de nuevo en unos segundos."
        : "Error al generar el resultado final realista.";
      setErrorMessage(msg);
      setStep(4);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-zinc-800">
      {/* Error Banner */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-6"
          >
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-950/50 flex items-center justify-center text-red-500">
                  <RefreshCw className="w-5 h-5 animate-spin-slow" />
                </div>
                <p className="text-sm font-medium text-zinc-200">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="p-1 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => {
            if (step !== 1) {
              if (confirm('¿Deseas volver al inicio? Se perderá el progreso actual.')) {
                setStep(1);
                setBodyImage(null);
                setFinalTryOnImage(null);
                setSelectedConcept(null);
              }
            }
          }}>
            <div className="relative">
              <div className="absolute inset-0 bg-zinc-100 blur-md opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <Crown className="w-8 h-8 text-zinc-100 relative z-10" />
            </div>
            <span className="text-xl font-black tracking-[0.15em] uppercase bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
              AL ESTILO ESTUDIO
            </span>
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
        <AnimatePresence mode="wait">
          {/* Step 1: Brief */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="max-w-2xl mx-auto"
            >
              <h1 className="text-5xl font-light tracking-tight mb-4">Crea tu diseño.</h1>
              <p className="text-zinc-400 text-lg mb-12 leading-relaxed">Describe tu idea, elige un estilo y deja que la IA genere conceptos únicos para tu próximo tatuaje.</p>

              <form onSubmit={handleGenerateConcepts} className="space-y-8 bg-zinc-900/30 p-8 rounded-3xl border border-zinc-800/50">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Estilo del Tatuaje</label>
                  <select
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-100 focus:ring-2 focus:ring-zinc-700 focus:border-transparent outline-none transition-all appearance-none"
                    value={formData.style}
                    onChange={e => setFormData({ ...formData, style: e.target.value })}
                  >
                    <option>Blackwork</option>
                    <option>Tradicional (Old School)</option>
                    <option>Neotradicional</option>
                    <option>Realismo (Blanco y Negro)</option>
                    <option>Realismo (Color)</option>
                    <option>Micro-realismo</option>
                    <option>Minimalista / Fineline</option>
                    <option>Japonés (Irezumi)</option>
                    <option>Acuarela (Watercolor)</option>
                    <option>Geométrico</option>
                    <option>Dotwork (Puntillismo)</option>
                    <option>Tribal / Polinesio</option>
                    <option>Maorí</option>
                    <option>Trash Polka</option>
                    <option>Ignorant Style</option>
                    <option>Black and Grey</option>
                    <option>Biomecánico</option>
                    <option>Lettering / Caligrafía</option>
                    <option>Anime / Otaku</option>
                    <option>Sketch (Boceto)</option>
                    <option>Surrealismo</option>
                    <option>Chicano</option>
                    <option>Ornamental / Mehndi</option>
                    <option>Handpoke</option>
                    <option>New School</option>
                    <option>Celta</option>
                    <option>Abstracto</option>
                    <option>Glitch</option>
                    <option>Cyberpunk</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Historia o Significado</label>
                  <textarea
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-100 focus:ring-2 focus:ring-zinc-700 focus:border-transparent outline-none transition-all min-h-[120px] resize-none"
                    placeholder="Ej: Quiero representar la superación de un momento difícil, como un fénix o algo relacionado con el renacer..."
                    value={formData.meaning}
                    onChange={e => setFormData({ ...formData, meaning: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Parte del Cuerpo</label>
                  <input
                    type="text"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-100 focus:ring-2 focus:ring-zinc-700 focus:border-transparent outline-none transition-all"
                    placeholder="Ej: Antebrazo"
                    value={formData.bodyPart}
                    onChange={e => setFormData({ ...formData, bodyPart: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Foto de Referencia (Opcional)</label>
                  <div className="flex gap-4 items-center">
                    <label className="flex-1 bg-zinc-950 border border-zinc-800 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-2 hover:bg-zinc-900/50 transition-colors cursor-pointer text-zinc-500">
                      {formData.referenceImage ? (
                        <img src={formData.referenceImage} className="w-20 h-20 object-cover rounded-lg border border-zinc-800" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8" />
                          <span className="text-xs">Subir referencia</span>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => setFormData({ ...formData, referenceImage: ev.target?.result as string });
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                    {formData.referenceImage && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, referenceImage: null })}
                        className="p-2 text-zinc-500 hover:text-red-400"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!formData.meaning || isGenerating}
                  className="w-full relative overflow-hidden bg-zinc-100 text-zinc-950 font-medium rounded-xl p-4 flex items-center justify-center gap-2 hover:bg-white transition-all disabled:opacity-80 disabled:cursor-not-allowed mt-4 group"
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-2 animate-pulse">
                      <Loader2 className="w-5 h-5 animate-spin" /> Creando magia...
                    </span>
                  ) : (
                    <><Sparkles className="w-5 h-5" /> Generar Ideas</>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* Step 2: Concepts & Designs */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {concepts.length === 0 ? (
                <div className="min-h-[60vh] flex items-center justify-center">
                  <LoadingInkAnimation label="Generando Ideas..." subLabel="Interpretando tu visión y creando conceptos únicos" />
                </div>
              ) : (
                <>
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
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 bg-zinc-900/50">
                              <LoadingInkAnimation label="Creando diseño..." />
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
                </>
              )}
            </motion.div>
          )}

          {/* Step 3: Photo Upload */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="max-w-2xl mx-auto"
            >
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setStep(2)} className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-900/50 hover:bg-zinc-800 px-4 py-2 rounded-full border border-zinc-800/50 transition-all">
                  <ArrowLeft className="w-4 h-4" /> Volver
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
            </motion.div>
          )}

          {/* Step 4: Pro Studio */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="max-w-6xl mx-auto"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                  <h1 className="text-4xl font-light tracking-tight mb-2">Estudio Pro</h1>
                  <p className="text-zinc-400">Ajusta, borra los excesos y aplica realismo.</p>
                </div>
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-900/50 hover:bg-zinc-800 px-4 py-2 rounded-full border border-zinc-800/50 transition-all self-start md:self-auto"
                >
                  <ArrowLeft className="w-4 h-4" /> Cambiar foto
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
                    {/* Design History Section */}
                    {designHistory.length > 0 && (
                      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-4 mb-4">
                        <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                          <RefreshCw className="w-3 h-3" /> Historial de Diseños
                        </div>
                        <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                          {designHistory.map((h, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                if (h.imageUrl) {
                                  setSelectedConcept(h);
                                  // This will trigger the Step 4 re-init in useEffect
                                }
                              }}
                              className={`aspect-square rounded-lg border-2 overflow-hidden transition-all ${selectedConcept?.imageUrl === h.imageUrl ? 'border-zinc-100 scale-95' : 'border-zinc-800 hover:border-zinc-600'}`}
                            >
                              {h.imageUrl ? (
                                <img src={h.imageUrl} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-zinc-900 animate-pulse" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

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
            </motion.div>
          )}

          {/* Step 5: Final AI Result */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="max-w-4xl mx-auto"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                <div>
                  <h1 className="text-4xl font-light tracking-tight mb-2">Resultado Final</h1>
                  <p className="text-zinc-400">Tu diseño adaptado anatómicamente con IA.</p>
                </div>
                <button
                  onClick={() => setStep(4)}
                  className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-900/50 hover:bg-zinc-800 px-4 py-2 rounded-full border border-zinc-800/50 transition-all self-start md:self-auto"
                >
                  <ArrowLeft className="w-4 h-4" /> Volver al estudio
                </button>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-2 md:p-6 relative overflow-hidden">
                {isGeneratingFinal ? (
                  <div className="aspect-[3/4] md:aspect-video rounded-2xl bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 border border-zinc-800/50 relative overflow-hidden">
                    <LoadingInkAnimation label="Procesando realismo..." subLabel="Añadiendo textura de piel y ajustando iluminación" />
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
                      setTattooPos({ x: 0, y: 0 });
                      setTattooScale(1);
                      setTattooRotation(0);
                      setEraserStrokes([]);
                      setFormData({ style: 'Blackwork', meaning: '', bodyPart: 'Antebrazo', referenceImage: null });
                    }}
                    className="bg-zinc-800 text-zinc-100 font-medium rounded-xl px-8 py-4 flex items-center justify-center gap-2 hover:bg-zinc-700 transition-colors"
                  >
                    Crear otro tatuaje
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 6: Booking */}
          {step === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="max-w-5xl mx-auto"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                <div>
                  <h1 className="text-4xl font-light tracking-tight mb-2">Reserva tu cita.</h1>
                  <p className="text-zinc-400">Elige el día y la hora para hacer realidad tu diseño en Al Estilo Estudio.</p>
                </div>
                <button
                  onClick={() => setStep(5)}
                  className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-900/50 hover:bg-zinc-800 px-4 py-2 rounded-full border border-zinc-800/50 transition-all self-start md:self-auto"
                >
                  <ArrowLeft className="w-4 h-4" /> Volver al resultado
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
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
