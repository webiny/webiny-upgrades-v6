import { createAbstraction } from "~/utils/createAbstraction.js";
import type { SemVer } from "semver";

interface IUpWebinyParams {
    version: SemVer;
    executeYarn: boolean;
}

interface IUpWebiny {
    execute(params: IUpWebinyParams): Promise<void>;
}

export const UpWebiny = createAbstraction<IUpWebiny>("Tool/UpWebiny");

export namespace UpWebiny {
    export type Interface = IUpWebiny;
    export type Params = IUpWebinyParams;
}
