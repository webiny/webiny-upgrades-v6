import { createAbstraction } from "../../utils/createAbstraction.js";

interface IGit {
    isClean(): Promise<boolean>;
    restore(): Promise<void>;
}

export const Git = createAbstraction<IGit>("Service/Git");

export namespace Git {
    export type Interface = IGit;
}
