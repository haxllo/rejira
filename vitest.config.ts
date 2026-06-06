import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["convex/_tests/**/*.test.ts"],
    setupFiles: [],
    // convex-test runs in-process; we use the default Node environment.
    testTimeout: 60_000,
  },
  resolve: {
    alias: {
      // Mirror the @/* alias used by the Next.js app so test files can
      // import fixtures with the same path they use at runtime.
      "@": new URL("./apps/web/", import.meta.url).pathname.replace(/\/$/, ""),
    },
  },
});
