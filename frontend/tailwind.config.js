export default {
  content: ["./src/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./index.html"],
  theme: {
    extend: {
      colors: {
        accent: "#111111",
        "accent-dark": "#333333",
        cream: "#ffffff",
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
