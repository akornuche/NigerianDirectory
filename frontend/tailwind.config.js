/** Nigerian green, from the flag (#008751) at 500; 700 is the field. */
function green() {
  return {
    50: '#EEF7F1',
    100: '#D6EDDF',
    200: '#AFDBC2',
    300: '#7EC39E',
    400: '#3FA16F',
    500: '#008751',
    600: '#007849',
    700: '#006A40',
    800: '#0B5233',
    900: '#0B3E28',
    950: '#062A1A',
  };
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Hallmark "Grid" material in Nigerian green. One field colour (green)
      // floods sections, one mark colour (red) marks the chosen or current
      // thing, and blue-black ink carries the type. The old blue, indigo,
      // violet and purple utilities are mapped onto the green scale so every
      // page takes the new palette without a second blue.
      colors: {
        primary: green(),
        accent: green(),
        blue: green(),
        indigo: green(),
        violet: green(),
        purple: green(),
        secondary: {
          50: '#FDF1EF',
          100: '#FADCD8',
          200: '#F4B8B0',
          300: '#EC8B7F',
          400: '#E2584A',
          500: '#D52B1E', // mark
          600: '#BC2219',
          700: '#9C1C15',
          800: '#7C1712',
          900: '#62130F',
        },
        ink: {
          DEFAULT: '#121826',
          2: '#283041',
          muted: '#5C6577',
        },
        paper: {
          DEFAULT: '#F8F7F3',
          2: '#EFEEE8',
          3: '#E5E3DC',
        },
        rule: '#DCDAD3',
        background: '#F8F7F3',
      },
      fontFamily: {
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Radio Canada Big"', 'var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // Square corners and no shadows: depth comes from scale and colour.
      // "full" stays round for dots and avatars.
      borderRadius: {
        none: '0',
        sm: '0',
        DEFAULT: '0',
        md: '0',
        lg: '0',
        xl: '0',
        '2xl': '0',
        '3xl': '0',
        full: '9999px',
      },
      boxShadow: {
        sm: 'none',
        DEFAULT: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none',
        '2xl': 'none',
        inner: 'none',
        none: 'none',
      },
      letterSpacing: {
        display: '-0.035em',
        poster: '-0.045em',
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
