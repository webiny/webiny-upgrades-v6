import { defineConfig, globalIgnores } from "eslint/config";
import tsParser from "@typescript-eslint/parser";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import _import from "eslint-plugin-import";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

function getNoUnusedVars() {
    if ("ESLINT_NO_UNUSED_VARS" in process.env) {
        return parseInt(process.env["ESLINT_NO_UNUSED_VARS"]);
    }
    return 1;
}

export default defineConfig([
    {
        files: ["**/*.ts"],
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
            import: _import
        },
        extends: compat.extends("plugin:@typescript-eslint/recommended"),
        rules: {
            "import/no-unresolved": 0,
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
            "@typescript-eslint/no-use-before-define": 0,
            "@typescript-eslint/no-unused-vars": getNoUnusedVars(),
            "@typescript-eslint/no-var-requires": 0,
            "@typescript-eslint/no-explicit-any": 0,
            "@typescript-eslint/no-non-null-assertion": 0,
            "@typescript-eslint/no-empty-object-type": [
                "error",
                {
                    allowInterfaces: "always",
                    allowObjectTypes: "never"
                }
            ],
            "@typescript-eslint/no-unused-expressions": "off",
            curly: ["error"]
        }
    },
    globalIgnores(["node_modules/", "dist/", "build/", "**/*.d.ts"])
]);
