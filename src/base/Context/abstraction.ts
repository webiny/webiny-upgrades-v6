import { createAbstraction } from "~/utils/createAbstraction.js";
import type { SemVer } from "semver";

interface IContext {
    cwd: string;
    registry: string;
    /**
     * Version received from user input.
     */
    inputVersion: string;
    /**
     * Version parsed via semver
     */
    targetVersion: SemVer;
    /**
     * Current version of webiny package.
     */
    currentVersion: SemVer;
}

export const Context = createAbstraction<IContext>("Base/Context");

export namespace Context {
    export type Interface = IContext;
}
