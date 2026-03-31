import { createAbstraction } from "../../utils/createAbstraction.js";

interface IUpgradeRunner {
    run(): Promise<void>;
}

export const UpgradeRunner = createAbstraction<IUpgradeRunner>("Base/UpgradeRunner");

export namespace UpgradeRunner {
    export type Interface = IUpgradeRunner;
}
