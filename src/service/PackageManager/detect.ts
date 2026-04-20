import path from "node:path";
import fs from "node:fs";
import { PackageManagerDetectionError } from "./PackageManagerDetectionError.js";

export type PackageManagerName = "yarn" | "pnpm" | "npm";

export const detectPackageManager = (
    cwd: string,
    forced?: PackageManagerName
): PackageManagerName => {
    if (forced) {
        return forced;
    }
    if (fs.existsSync(path.join(cwd, "yarn.lock"))) {
        return "yarn";
    }
    if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) {
        return "pnpm";
    }
    if (fs.existsSync(path.join(cwd, "package-lock.json"))) {
        return "npm";
    }
    throw new PackageManagerDetectionError(cwd);
};
