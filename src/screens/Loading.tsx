// Loading.tsx
import { motion } from 'framer-motion';

export default function Loading() {
    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background glowing effects */}
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#C6A87C] rounded-full blur-[100px]"
            />

            <div className="relative z-10 flex flex-col items-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 border-t-2 border-r-2 border-[#C6A87C] border-opacity-80 rounded-full mb-8 shadow-[0_0_15px_rgba(198,168,124,0.5)] bg-transparent"
                />

                <h2 className="text-[#F2F2F2] font-display text-2xl font-bold tracking-tight mb-2">Analizando Visión</h2>
                <motion.p
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-[#888888] text-sm uppercase tracking-widest font-semibold"
                >
                    Consultando a la IA Artística...
                </motion.p>
            </div>
        </div>
    );
}
