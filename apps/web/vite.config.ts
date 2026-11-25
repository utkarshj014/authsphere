import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const API_TARGET = process.env.VITE_API_URL || "http://localhost:3000";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "^/api/docs$": {
        target: API_TARGET,
        bypass: (_req, res) => {
          res.writeHead(301, { Location: "/api/docs/" });
          res.end();
          return false;
        },
      },
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "^/docs/?$": {
        target: API_TARGET,
        bypass: (_req, res) => {
          res.writeHead(301, { Location: "/api/docs/" });
          res.end();
          return false;
        },
      },
      "/openapi.json": {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
