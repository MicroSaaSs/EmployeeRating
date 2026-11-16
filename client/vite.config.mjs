import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: { outDir: "build" },
  plugins: [react()],
  server: {
    port: 4028,
    strictPort: true,
    proxy: {
      "/api": process.env.API_PROXY_TARGET || "http://127.0.0.1:3000",
    },
  },
});
