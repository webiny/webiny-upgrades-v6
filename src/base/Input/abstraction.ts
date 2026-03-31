import { createAbstraction } from "../../utils/createAbstraction.js";

interface IInput {
    cwd: string;
    registry: string;
    version: string;
    logLevel: "debug" | "info" | "warn" | "error";
    json: boolean;
    forceUpgrade: boolean;
    packageManager?: "yarn" | "pnpm" | "npm";
    skipDependencyGuard: boolean;
    dryRun: boolean;
}

export const Input = createAbstraction<IInput>("Base/Input");

export namespace Input {
    export type Interface = IInput;
}
