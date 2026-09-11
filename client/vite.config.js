import { defineConfig, transformWithEsbuild } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    {
      name: "treat-js-files-as-jsx",
      enforce: "pre",

      async transform(code, id) {
        if (
          id.includes("/src/") &&
          id.endsWith(".js")
        ) {
          return transformWithEsbuild(
            code,
            id,
            {
              loader: "jsx",
              jsx: "automatic",
            }
          );
        }
      },
    },

    react(),
  ],
server: {
    proxy: {
      "/api": {
        target: "https://localhost:3001",
        changeOrigin: true,
        secure: false,
      },

      "/sftp": {
        target: "https://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
});