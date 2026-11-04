import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5180,
      // Same /supabase proxy as vercel.json, so local dev exercises the production path.
      proxy: {
        "/supabase": {
          target: env.VITE_SUPABASE_URL,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/supabase/, ""),
        },
      },
    },
  };
});
