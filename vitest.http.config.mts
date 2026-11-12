import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// `npm run test:http`: tests that need a production build and a running
// `next start` (tests/http/). Run after `npm run build`.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: {
    include: ["tests/http/**/*.test.ts"],
    environment: "node",
    testTimeout: 20000,
    fileParallelism: false,
  },
});
