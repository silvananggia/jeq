import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function deviceProxyTarget(url) {
  const match = url.match(/^\/device-proxy\/([^/]+)\/(\d+)(\/.*)?(?:\?.*)?$/);
  if (!match) return null;
  return {
    target: `http://${match[1]}:${match[2]}`,
    path: match[3] || "/",
  };
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/device-proxy": {
        target: "http://127.0.0.1",
        changeOrigin: true,
        router: (req) => deviceProxyTarget(req.url || "")?.target,
        rewrite: (path) => deviceProxyTarget(path)?.path || "/",
      },
    },
  },
});
