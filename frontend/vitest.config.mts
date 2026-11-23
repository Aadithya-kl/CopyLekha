import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Reads the "@/*" path from tsconfig.json, so tests import like the app does.
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    // Browser features jsdom lacks, for the Radix components.
    setupFiles: ["./vitest.setup.ts"],
    // Playwright flows live in e2e/ and run with `npm run test:e2e`, not Vitest.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
