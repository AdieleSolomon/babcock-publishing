/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "babcock-blue": "#003366",
        "babcock-gold": "#FFD700",
        "babcock-navy": "#0A2463",
        "babcock-light-blue": "#0077B6",
        "gray-50": "#F9FAFB",
        "gray-300": "#D1D5DB",
        "gray-800": "#1F2937",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Merriweather", "serif"],
      },
    },
  },
  plugins: [],
};
