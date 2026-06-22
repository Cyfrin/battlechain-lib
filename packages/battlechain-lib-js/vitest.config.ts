import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["test/**/*.test.ts"],
    typecheck: { enabled: false },
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
});
