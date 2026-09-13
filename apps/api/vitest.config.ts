import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    root: ".",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
    },
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: [
        "src/generated/**",
        "src/types/**",
        "src/server.ts",
        "src/workers/**",
      ],
    },
  },
});
