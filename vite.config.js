import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  build: {
    target: "esnext",
  },
  base: "/tiny-planets",
});
