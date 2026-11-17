import type { Config } from 'tailwindcss';
import { fileURLToPath } from 'node:url';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url)).replace(/\\/g, '/');

export default {
  content: [here('./client/index.html'), here('./client/src') + '/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#09090D',
        card: '#15151D',
        raised: '#20202B',
        violet: '#A78BFA',
        pink: '#F0A6C8',
        lav: '#C4B5FD',
        fg: '#F5F3FA',
        mute: '#9693A3',
        line: 'rgba(245, 243, 250, 0.08)',
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
      },
      letterSpacing: { label: '0.18em' },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'none' } },
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
        drift: { '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' }, '50%': { transform: 'translate3d(2%, -3%, 0) scale(1.06)' } },
        eq: { '0%,100%': { transform: 'scaleY(0.35)' }, '50%': { transform: 'scaleY(1)' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      },
      animation: {
        rise: 'rise 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        fade: 'fade 0.3s ease both',
        drift: 'drift 18s ease-in-out infinite',
        eq: 'eq 0.9s ease-in-out infinite',
        marquee: 'marquee 48s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
