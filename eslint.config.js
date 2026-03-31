import { defineConfig, globalIgnores } from "eslint/config";
import tsParser from "@typescript-eslint/parser";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import importX from "eslint-plugin-import-x";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig([
    ...typescriptEslint.configs["flat/recommended"],
    {
        files: ["./src/**/*.ts", "./src/**/*.tsx", "./src/**/*.js", "./src/**/*.jsx"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: resolve(__dirname, "./tsconfig.json"),
                tsconfigRootDir: __dirname,
                sourceType: "module"
            },
            globals: {
                node: true,
                commonjs: true
            }
        },
        plugins: {
            "@typescript-eslint": typescriptEslint,
            "import-x": importX
        },
        rules: {
            "import-x/no-unresolved": "off",
            "@typescript-eslint/no-namespace": "off",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/ban-ts-comment": [
                2,
                {
                    "ts-check": true,
                    "ts-ignore": "allow-with-description",
                    "ts-nocheck": "allow-with-description",
                    "ts-expect-error": false
                }
            ],
            "@typescript-eslint/no-restricted-types": "error",
            "@typescript-eslint/no-use-before-define": "error",
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
            "@typescript-eslint/no-var-requires": "error",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/no-empty-object-type": [
                "error",
                {
                    allowInterfaces: "always",
                    allowObjectTypes: "never"
                }
            ],
            "@typescript-eslint/no-unused-expressions": "error",
            curly: ["error"]
        }
    },
    globalIgnores([".yarn/", "node_modules/", "dist/", "build/", "coverage/", "**/*.d.ts"])
]);
