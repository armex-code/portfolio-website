/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './js/site.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        signal: '#e5322d', // Swiss red, used sparingly
      },
    },
  },
  plugins: [],
};
