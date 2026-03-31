import { DependencyGuard as DependencyGuardAbstraction } from "./abstraction.js";
import { PackageJsonTool } from "../PackageJsonTool/index.js";
import { Input } from "../../base/Input/index.js";
import { ReferencesService } from "../../service/References/index.js";

const SKIP_PACKAGES = new Set([
    // eslint and related
    "eslint",
    "@eslint/js",
    "@eslint/eslintrc",
    "@eslint/compat",
    "eslint-config-prettier",
    "eslint-plugin-import",
    "eslint-plugin-prettier",
    "eslint-plugin-react",
    "eslint-plugin-react-hooks",
    "@typescript-eslint/eslint-plugin",
    "@typescript-eslint/parser",
    // prettier
    "prettier",
    // node
    "@types/node"
]);

const isWebinyPackage = (name: string): boolean => {
    return name.startsWith("@webiny/") || name === "webiny";
};

const SECTIONS = ["dependencies", "devDependencies", "peerDependencies", "resolutions"] as const;

type Section = (typeof SECTIONS)[number];

const stripRange = (version: string): string => {
    return version.replace(/^[\^~>=<v\s]+/, "");
};

class DependencyGuardImpl implements DependencyGuardAbstraction.Interface {
    public constructor(
        private readonly input: Input.Interface,
        private readonly packageJsonTool: PackageJsonTool.Interface,
        private readonly referencesService: ReferencesService.Interface
    ) {}

    public execute(): DependencyGuardAbstraction.Mismatch[] {
        if (this.input.skipDependencyGuard) {
            return [];
        }

        const packageJson = this.packageJsonTool.load();
        if (!packageJson) {
            throw new Error("Failed to load package.json");
        }
        const mismatches: DependencyGuardAbstraction.Mismatch[] = [];

        const getUserSection = (section: Section): Record<string, string> => {
            switch (section) {
                case "dependencies":
                    return packageJson.getDependencies();
                case "devDependencies":
                    return packageJson.getDevDependencies();
                case "peerDependencies":
                    return packageJson.getPeerDependencies();
                case "resolutions":
                    return packageJson.getResolutions();
            }
        };

        for (const section of SECTIONS) {
            const userDeps = getUserSection(section);
            for (const [name, userVersion] of Object.entries(userDeps)) {
                if (isWebinyPackage(name) || SKIP_PACKAGES.has(name)) {
                    continue;
                }
                const ref = this.referencesService.getVersion(name);
                if (!ref) {
                    continue;
                }
                const strippedUser = stripRange(userVersion);
                const strippedExpected = stripRange(ref);
                if (strippedUser === strippedExpected) {
                    continue;
                }
                mismatches.push({
                    name,
                    userVersion: strippedUser,
                    expectedVersion: strippedExpected
                });
            }
        }
        return mismatches;
    }
}

export const DependencyGuard = DependencyGuardAbstraction.createImplementation({
    implementation: DependencyGuardImpl,
    dependencies: [Input, PackageJsonTool, ReferencesService]
});
