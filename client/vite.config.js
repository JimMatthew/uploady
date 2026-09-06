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

  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
});