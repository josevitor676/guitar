import type { Config } from 'tailwindcss'
import { COLORS } from './src/design/tokens'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ...COLORS },
      borderRadius: {
        card: '1rem',
      },
    },
  },
  plugins: [],
} satisfies Config
