/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#B89B7E',
          50: '#F5F0EB',
          100: '#EBE1D7',
          200: '#D7C3AF',
          300: '#C4A484',
          400: '#B89B7E',
          500: '#9C662E',
          600: '#7D5226',
          700: '#5E3D1E',
          800: '#3F2916',
          900: '#20140E',
        },
      },
    },
  },
  plugins: [],
}
