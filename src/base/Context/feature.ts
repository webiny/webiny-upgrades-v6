import { createFeature } from "~/utils/createFeature.js";
import path from "node:path";
import { PackageJsonService } from "~/service/PackageJson/index.js";
import semver from "semver";
import { Context } from "./abstraction.js";

interface IContextParams {
    cwd: string;
    registry: string;
    inputVersion: string;
    version: semver.SemVer;
}

export const ContextFeature = createFeature<IContextParams>({
    name: "Base/Context",
    register(container, params) {
        if (!params) {
            throw new Error(`ContextFeature requires parameters to be registered!`);
        }
        const packageJsonService = container.resolve(PackageJsonService);

        const target = path.join(params.cwd, "node_modules", "webiny/package.json");
        const packageJson = packageJsonService.load(target);
        if (!packageJson) {
            throw new Error(`Failed to load ${target}.`);
        }
        const currentVersion = semver.parse(packageJson.raw.version);
        if (!currentVersion) {
            throw new Error(
                `Failed to parse current Webiny version from package.json: ${packageJson.raw.version}`
            );
        }
        container.registerInstance(Context, {
            cwd: params.cwd,
            registry: params.registry,
            inputVersion: params.inputVersion,
            targetVersion: params.version,
            currentVersion: currentVersion
        });
    }
});
