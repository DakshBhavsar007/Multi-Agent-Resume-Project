export default {
  content: ["./src/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./index.html"],
  theme: {
    extend: {
      colors: {
        accent: "#2563EB",
        "accent-dark": "#1D4ED8",
        cream: "#F5F0E8",
        charcoal: "#2A2A2A",
      },
      fontFamily: { sans: ["Inter","sans-serif"] },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' }
        }
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite'
      }
    }
  },
  plugins: []
}
