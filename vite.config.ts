import { defineConfig } from "vitest/config";

export default defineConfig({
  server: { host: "127.0.0.1" },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Phaser alone is ~1.2 MB minified; keep it in its own cacheable chunk.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: { phaser: ["phaser"] },
      },
    },
  },
  test: {
    // Pure-logic tests only; they must not boot Phaser or touch the DOM.
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globals: false,
  },
});
