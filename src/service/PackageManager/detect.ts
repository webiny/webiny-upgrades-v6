import path from "node:path";
import fs from "node:fs";

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
    throw new Error(
        `Could not detect package manager in "${cwd}". No yarn.lock, pnpm-lock.yaml, or package-lock.json found. Use --package-manager to specify one.`
    );
};
