import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/convex-tests/**/*.test.ts"],
    setupFiles: [],
    testTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": new URL("./apps/web/", import.meta.url).pathname.replace(/\/$/, ""),
    },
  },
});
