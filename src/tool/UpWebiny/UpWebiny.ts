import { UpWebiny as UpWebinyAbstraction } from "./abstraction.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";

const isWebinyUpgradeable = (dep: string): boolean => {
    return dep.startsWith("@webiny/") && dep !== "@webiny/di";
};

class UpWebinyImpl implements UpWebinyAbstraction.Interface {
    public constructor(private readonly packageJsonTool: PackageJsonTool.Interface) {}

    public async execute(params: UpWebinyAbstraction.Params): Promise<void> {
        const { version } = params;

        const packageJson = this.packageJsonTool.load();
        if (!packageJson) {
            throw new Error(`Failed to load root package.json.`);
        }
        /**
         * We want to make sure that all @webiny/* dependencies are updated to the same version,
         * and that they are all in "dependencies" (not dev or peer).
         * This was a bug in 6.0.0 where some dependencies were in dev - no issues, just wrong position.
         */
        packageJson.setDependency("webiny", version.raw);
        packageJson.removeDevDependency("webiny");
        packageJson.setDependency("@webiny/cli", version.raw);
        packageJson.removeDevDependency("@webiny/cli");
        packageJson.setDependency("@webiny/mcp", version.raw);
        /**
         * If @webiny/cognito is present, we want to move it to dependencies and update the version. This is because in 6.0.0 it was added as a dev dependency, but it should be a regular dependency.
         * There is a possibility that it is not present at all, and that's fine - user is using some other auth solution.
         */
        const webinyCognito = "@webiny/cognito";
        if (
            packageJson.getDependency(webinyCognito) ||
            packageJson.getDevDependency(webinyCognito)
        ) {
            packageJson.setDependency(webinyCognito, version.raw);
            packageJson.removeDevDependency(webinyCognito);
        }

        for (const dep in packageJson.getDependencies()) {
            if (!isWebinyUpgradeable(dep)) {
                continue;
            }
            packageJson.setDependency(dep, version.raw);
        }

        for (const dep in packageJson.getDevDependencies()) {
            if (!isWebinyUpgradeable(dep)) {
                continue;
            }
            packageJson.setDependency(dep, version.raw);
            packageJson.removeDevDependency(dep);
        }

        for (const dep in packageJson.getPeerDependencies()) {
            if (!isWebinyUpgradeable(dep)) {
                continue;
            }
            packageJson.setDependency(dep, version.raw);
            packageJson.removePeerDependency(dep);
        }

        for (const dep in packageJson.getResolutions()) {
            if (!isWebinyUpgradeable(dep)) {
                continue;
            }
            packageJson.setResolution(dep, version.raw);
        }

        this.packageJsonTool.save(packageJson);
    }
}

export const UpWebiny = UpWebinyAbstraction.createImplementation({
    implementation: UpWebinyImpl,
    dependencies: [PackageJsonTool]
});
