/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                bg: '#050505',
                surface: '#141414',
                'surface-accent': '#1F1F1F',
                gold: '#C6A87C',
                textMain: '#F2F2F2',
                textMuted: '#888888',
                'border-subtle': 'rgba(255, 255, 255, 0.08)',
                primary: '#C6A87C',
                'bg-light': '#F5F5F7',
                'card-white': '#FFFFFF',
                'text-charcoal': '#1D1D1F',
                'text-muted': '#86868B',
                'glass-light': 'rgba(255, 255, 255, 0.75)',
                'glass-border': 'rgba(0, 0, 0, 0.04)',
            },
            borderRadius: {
                bento: '32px',
                pill: '9999px',
                inner: '24px'
            },
            boxShadow: {
                'bento-soft': '0 4px 24px rgba(0, 0, 0, 0.04)',
                'nav-soft': '0 10px 40px rgba(0, 0, 0, 0.08)',
            },
            fontFamily: {
                display: ['Space Grotesk', 'sans-serif'],
                body: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            }
        },
    },
    plugins: [],
}
