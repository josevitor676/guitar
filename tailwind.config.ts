import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#ebebeb',
        card: '#1b1b1b',
        surface: '#262626',
        body: '#1b1b1b',
        'text-primary': '#fafafa',
        'text-secondary': '#a1a1a1',
      },
    },
  },
  plugins: [],
} satisfies Config
