import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a", // primary text
        paper: "#ffffff", // page background
        mist: "#f6f7f9", // quiet surface for sections / app background
        line: "#e5e7eb", // hairline borders
        accent: {
          DEFAULT: "#2453e0",
          dark: "#1b41b5",
          soft: "#eef2fd",
        },
      },
      fontFamily: {
        sans: [
          "Inter Variable",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      maxWidth: {
        screen: "560px", // single-column width for the question flow + results
        page: "1120px", // marketing / landing width
      },
    },
  },
  plugins: [],
};

export default config;
