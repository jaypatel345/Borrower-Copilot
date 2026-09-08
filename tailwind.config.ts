import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1a1a1a",
        paper: "#faf9f7",
        accent: "#1f6feb",
      },
      maxWidth: {
        screen: "430px", // mobile-first single column
      },
    },
  },
  plugins: [],
};

export default config;
