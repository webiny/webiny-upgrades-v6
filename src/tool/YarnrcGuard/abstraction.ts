import { createAbstraction } from "../../utils/createAbstraction.js";
import type { Version } from "../../base/Version/index.js";

interface IYarnrcGuardParams {
    targetVersion: Version;
    breakOnVersion: Version;
}

interface IYarnrcGuard {
    execute(params: IYarnrcGuardParams): void;
}

export const YarnrcGuard = createAbstraction<IYarnrcGuard>("Tool/YarnrcGuard");

export namespace YarnrcGuard {
    export type Interface = IYarnrcGuard;
    export type Params = IYarnrcGuardParams;
}
