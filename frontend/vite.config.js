import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/auth": "http://localhost:8001",
      "/ask": "http://localhost:8001",
      "/admin": "http://localhost:8001",
      "/billing": "http://localhost:8001",
      "/health": "http://localhost:8001",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
