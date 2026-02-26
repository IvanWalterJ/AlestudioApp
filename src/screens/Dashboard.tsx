// Dashboard.tsx

export default function Dashboard({ onStart }: { onStart: () => void }) {
    return (
        <div className="min-h-screen bg-bg-light text-text-charcoal font-body relative overflow-x-hidden max-w-md mx-auto">
            <header className="sticky top-0 z-50 px-6 py-6 flex items-center justify-between bg-bg-light/80 backdrop-blur-lg">
                <div className="w-10"></div>
                <h1 className="text-text-charcoal font-display font-bold text-[13px] tracking-[0.25em] uppercase">INK & SHADOW</h1>
                <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-black/[0.03] active:scale-95 transition-transform">
                    <span className="material-symbols-outlined text-[20px] text-text-charcoal">settings</span>
                </button>
            </header>

            <main className="flex-1 px-5 pb-36 pt-12 space-y-8 overflow-y-auto no-scrollbar flex flex-col justify-center">

                <div className="text-center mb-8">
                    <h2 className="text-text-charcoal font-display font-medium text-lg leading-tight mb-2">Bienvenido a</h2>
                    <h1 className="text-text-charcoal font-display font-bold text-4xl leading-tight tracking-tight">Focus Studio</h1>
                    <p className="text-text-muted mt-4 text-sm max-w-[250px] mx-auto">Tu espacio para consultar y visualizar el diseño perfecto en tiempo real con Inteligencia Artificial.</p>
                </div>

                <section className="grid grid-cols-2 gap-4">
                    <button
                        onClick={onStart}
                        className="col-span-2 h-48 rounded-bento bg-gradient-to-br from-[#F3E7D3] to-[#E2D1B3] relative group active:scale-[0.98] transition-all duration-300 flex flex-col justify-end p-8 text-left shadow-lg overflow-hidden"
                    >
                        {/* Decorative background circle */}
                        <div className="absolute top-[-20%] right-[-10%] w-48 h-48 rounded-full bg-white/20 blur-2xl"></div>

                        <div className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform z-10">
                            <span className="material-symbols-outlined text-text-charcoal text-2xl">add</span>
                        </div>
                        <div className="space-y-1 z-10">
                            <span className="text-text-charcoal/50 font-display font-bold text-[10px] tracking-widest uppercase block">GENERAR TATUAJE</span>
                            <h2 className="text-text-charcoal font-display font-bold text-3xl leading-tight">NUEVA<br />SESIÓN</h2>
                        </div>
                    </button>
                </section>

            </main>

            <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-bg-light via-bg-light/90 to-transparent pointer-events-none z-40"></div>

            <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-[360px] h-20 bg-glass-light backdrop-blur-2xl border border-glass-border rounded-pill px-6 flex items-center justify-between z-50 shadow-nav-soft">
                <button className="flex items-center justify-center w-12 h-12 text-text-charcoal bg-black/[0.03] rounded-full">
                    <span className="material-symbols-outlined font-variation-fill text-[24px]">grid_view</span>
                </button>
                <button className="flex items-center justify-center w-12 h-12 text-text-muted hover:text-text-charcoal transition-colors">
                    <span className="material-symbols-outlined text-[24px]">auto_awesome_motion</span>
                </button>
                <div className="relative -top-4">
                    <button
                        onClick={onStart}
                        className="w-16 h-16 bg-gradient-to-br from-[#F3E7D3] to-[#E2D1B3] rounded-full shadow-lg shadow-primary/20 flex items-center justify-center border-[5px] border-bg-light active:scale-90 transition-all text-text-charcoal font-bold"
                    >
                        <span className="material-symbols-outlined text-3xl">add</span>
                    </button>
                </div>
                <button className="flex items-center justify-center w-12 h-12 text-text-muted hover:text-text-charcoal transition-colors">
                    <span className="material-symbols-outlined text-[24px]">camera_alt</span>
                </button>
                <button className="flex items-center justify-center w-12 h-12 text-text-muted hover:text-text-charcoal transition-colors">
                    <span className="material-symbols-outlined text-[24px]">person</span>
                </button>
            </nav>
        </div>
    );
}
