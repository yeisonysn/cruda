/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cruda: {
          black: "#111313",      // Negro profundo
          graphite: "#292B2B",   // Gris grafito
          cement: "#A7A7A2",     // Gris cemento
          mineral: "#F1F0EB",    // Blanco mineral
          sand: "#D5C8B5",       // Arena
          olive: "#596153",      // Verde oliva
          champagne: "#B6A17E",  // Champagne
          darkCard: "#181A1A",
          lightCard: "#F9F8F5",
          borderLight: "rgba(167, 167, 162, 0.25)",
          borderDark: "rgba(241, 240, 235, 0.12)",
          glassLight: "rgba(241, 240, 235, 0.72)",
          glassDark: "rgba(17, 19, 19, 0.78)",
        }
      },
      fontFamily: {
        serif: ['"Cinzel"', '"Italiana"', 'serif'],
        display: ['"Syne"', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      letterSpacing: {
        'super-wide': '0.25em',
        'ultra-wide': '0.35em',
      },
      boxShadow: {
        'subtle': '0 4px 20px -2px rgba(17, 19, 19, 0.05)',
        'luxury': '0 20px 40px -15px rgba(17, 19, 19, 0.12)',
        'sculptural': '0 30px 60px -12px rgba(17, 19, 19, 0.25)',
        'glass': '0 8px 32px 0 rgba(17, 19, 19, 0.08)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-8px) rotate(1deg)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        }
      },
      animation: {
        'float-slow': 'float 7s ease-in-out infinite',
        'pulse-slow': 'pulseSlow 4s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}

