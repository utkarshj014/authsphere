import { defineConfig } from "tsup";

export default defineConfig({
  entry: { lambda: "src/lambda.ts" },
  format: ["esm"],
  target: "node24",
  platform: "node",
  clean: false,
  minify: true,
  sourcemap: true,
  shims: true,
  splitting: false,
  // Bundle all dependencies into lambda.mjs except native C++ addons (argon2),
  // which require node_modules path resolution for precompiled .node binaries.
  noExternal: [/^(?!argon2).*$/],
  external: ["argon2"],
  outDir: "../../infra/lambda",
  outExtension: () => ({ js: ".mjs" }),
  // Define require() in ESM scope for bundled CommonJS packages (serverless-express, etc.)
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
});
