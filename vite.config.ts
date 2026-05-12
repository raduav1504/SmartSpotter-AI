import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    viteTsConfigPaths(),
    tanstackStart({
      server: { entry: "server" },
    }),
    react(),
  ],
  server: {
    port: 8080,
  },
});