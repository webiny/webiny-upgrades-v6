import { createAbstraction } from "../../utils/createAbstraction.js";
import { Version } from "../../base/Version/index.js";

interface IUpWebinyParams {
    version: Version;
}

interface IUpWebiny {
    execute(params: IUpWebinyParams): Promise<void>;
}

export const UpWebiny = createAbstraction<IUpWebiny>("Tool/UpWebiny");

export namespace UpWebiny {
    export type Interface = IUpWebiny;
    export type Params = IUpWebinyParams;
}
