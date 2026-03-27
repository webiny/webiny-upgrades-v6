import { createFeature } from "~/utils/createFeature.js";
import { Input } from "./abstraction.js";

interface IInputParams {
    cwd: string;
    registry: string;
    version: string;
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
            version: params.version
        });
    }
});
