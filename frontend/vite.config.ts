import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // Load env from the current directory (frontend/)
  const env = loadEnv(mode, process.cwd(), "");

  const bffTarget = env.VITE_BFF_URL || "http://127.0.0.1:8080";

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      port: 5173,
      host: "0.0.0.0",
      proxy: {
        "/api": {
          target: bffTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  };
});
