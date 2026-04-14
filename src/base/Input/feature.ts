import { createFeature } from "../../utils/createFeature.js";
import { Input } from "./abstraction.js";

interface IInputParams {
    cwd: string;
    registry: string;
    version: string;
    logLevel: "debug" | "info" | "warn" | "error";
    json: boolean;
    forceUpgrade: boolean;
    packageManager?: "yarn" | "pnpm" | "npm";
    skipDependencyGuard: boolean;
    dryRun: boolean;
    installVersion?: string;
}

export const InputFeature = createFeature<IInputParams>({
    name: "Base/Input",
    register(container, params) {
        if (!params) {
            throw new Error(`InputFeature requires parameters to be registered!`);
        }
        container.registerInstance(Input, {
            cwd: params.cwd,
            registry: params.registry,
            version: params.version,
            logLevel: params.logLevel,
            json: params.json,
            forceUpgrade: params.forceUpgrade,
            packageManager: params.packageManager,
            skipDependencyGuard: params.skipDependencyGuard,
            dryRun: params.dryRun,
            installVersion: params.installVersion
        });
    }
});
