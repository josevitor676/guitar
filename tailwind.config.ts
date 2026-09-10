import type { Config } from 'tailwindcss'
import { COLORS, FONT_STACK } from './src/design/tokens'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ...COLORS },
      fontFamily: { sans: FONT_STACK },
      borderRadius: {
        card: '1rem',
      },
    },
  },
  plugins: [],
} satisfies Config
