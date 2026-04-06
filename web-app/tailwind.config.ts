import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#06080d',
        surface: '#0d1017',
        surface2: '#141820',
        border: '#1c2130',
        text: '#e2e8f0',
        text2: '#8294a8',
        accent: '#00e59b',
        accent2: '#00c4ff',
      },
      fontFamily: {
        sans: ['Instrument Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
