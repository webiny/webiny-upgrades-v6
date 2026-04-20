import { createFeature } from "../../utils/createFeature.js";
import { Context as ContextAbstraction } from "./abstraction.js";
import { Context } from "./Context.js";
import { Version } from "../Version/index.js";

interface IContextParams {
    cwd: string;
    registry: string;
    inputVersion: string;
    targetVersion: Version;
    installedVersion: Version;
}

export const ContextFeature = createFeature<IContextParams>({
    name: "Base/Context",
    register(container, params) {
        container.registerInstance(
            ContextAbstraction,
            new Context({
                cwd: params.cwd,
                registry: params.registry,
                inputVersion: params.inputVersion,
                targetVersion: params.targetVersion,
                installedVersion: params.installedVersion
            })
        );
    }
});
