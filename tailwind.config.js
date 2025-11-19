/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e6f7fb',
          100: '#c2ecf5',
          200: '#85d9eb',
          300: '#47c6e1',
          400: '#1aacce',
          500: '#0D98BA',
          600: '#0a7a96',
          700: '#085c71',
          800: '#053d4b',
          900: '#031f26',
        },
      },
    },
  },
  plugins: [],
};
