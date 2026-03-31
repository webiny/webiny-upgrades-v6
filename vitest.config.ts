import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        coverage: {
            reporter: ["text", "html"],
            reportsDirectory: "coverage",
            include: ["src/**"],
            exclude: [
                "src/**/index.ts",
                "src/**/feature.ts",
                "src/**/abstraction.ts",
                "src/__tests__/**"
            ]
        }
    }
});
