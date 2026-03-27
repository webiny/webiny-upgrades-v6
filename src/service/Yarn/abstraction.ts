import { createAbstraction } from "~/utils/createAbstraction.js";
import type { SemVer } from "semver";

interface IYarn {
    install(): Promise<void>;
    version(): Promise<SemVer>;
}

export const Yarn = createAbstraction<IYarn>("Service/Yarn");

export namespace Yarn {
    export type Interface = IYarn;
}
