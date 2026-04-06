import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#13261d",
        moss: "#204f3a",
        leaf: "#38795b",
        mist: "#eff6f1",
        clay: "#ecdcc7",
        amber: "#c67f2a",
      },
      boxShadow: {
        soft: "0 24px 80px rgba(17, 40, 27, 0.12)",
      },
      fontFamily: {
        sans: ["Avenir Next", "Hiragino Sans", "Yu Gothic", "sans-serif"],
        serif: ["Iowan Old Style", "Palatino", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;

