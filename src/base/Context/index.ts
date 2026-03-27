import { ContextFeature } from "./feature.js";
import type { Container } from "@webiny/di";
import { Input } from "~/base/Input/index.js";
import type { SemVer } from "semver";
import { NpmService } from "~/service/Npm/index.js";

export { Context } from "./abstraction.js";
export const registerContext = async (container: Container): Promise<void> => {
    const input = container.resolve(Input);
    const npm = container.resolve(NpmService);
    /**
     * If input version is latest or not provided, we need to fetch latest one.
     */
    let resolvedVersion: SemVer;
    if (!input.version || input.version === "latest") {
        const result = await npm.getLatestVersion("webiny");
        if (!result) {
            throw new Error("Failed to fetch latest version of Webiny.");
        }
        resolvedVersion = result;
    } else {
        const result = await npm.getVersion("webiny", input.version);
        if (!result) {
            throw new Error(`Failed to fetch version ${input.version} of Webiny.`);
        }
        resolvedVersion = result;
    }

    ContextFeature.register(container, {
        cwd: input.cwd,
        registry: input.registry,
        inputVersion: input.version,
        version: resolvedVersion
    });
};
