import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Same-origin API via proxy (mirrors the production CloudFront path routing in the blueprint §8.2).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": { target: "http://127.0.0.1:8000", changeOrigin: false } },
  },
});
