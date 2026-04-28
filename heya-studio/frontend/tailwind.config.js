/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--theme-primary)',
        secondary: 'var(--theme-secondary)',
        accent: 'var(--theme-accent)',
      },
      fontFamily: {
        sans: ['Noto Sans SC', 'Inter', 'system-ui', 'sans-serif'],
        japanese: ['Noto Sans JP', 'sans-serif'],
      },
      animation: {
        'avatar-glow': 'avatar-glow 3s ease-in-out infinite',
        'star-fall': 'star-fall linear infinite',
        'cursor-blink': 'cursor-blink 0.8s infinite',
      },
    },
  },
  plugins: [],
}
