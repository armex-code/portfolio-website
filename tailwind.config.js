/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './js/site.js'],
  theme: {
    extend: {
      fontFamily: {
        // Self-hosted from /fonts (see src/tailwind.css)
        sans: ['Archivo', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"Fragment Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      colors: {
        paper: '#ffffff',
        ink: '#0b0b0b',
        graphite: '#5f5f5f',
        rule: '#d6d6d4',
        fog: '#f1f1ef',
        signal: '#e10600', // Swiss red, the only accent
      },
      letterSpacing: {
        display: '-0.045em',
      },
    },
  },
  plugins: [],
};
