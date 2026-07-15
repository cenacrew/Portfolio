import { defineConfig } from "vitest/config";

// Unit tests for the critical shared core: the deterministic collision
// resolver / empty-row compaction (the anti-overlap guarantee behind the
// public /qrcode grid) and every widget type's Zod config schema.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
