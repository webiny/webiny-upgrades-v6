import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        setupFiles: ["./vitest.setup.ts"],
        coverage: {
            reporter: ["text", "html"],
            reportsDirectory: "coverage",
            include: ["src/**"],
            exclude: [
                "src/**/index.ts",
                "src/**/feature.ts",
                "src/**/abstraction.ts",
                "src/__tests__/**",
                "src/**/fixtures/**"
            ],
            thresholds: {
                statements: 100,
                branches: 98,
                functions: 100,
                lines: 100
            }
        }
    }
});
