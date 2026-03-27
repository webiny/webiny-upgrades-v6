import { createAbstraction } from "~/utils/createAbstraction.js";
import type { SemVer } from "semver";

interface IUpgradeParams {
    version: SemVer;
}

interface IUpgrade {
    canHandle(params: IUpgradeParams): Promise<boolean>;
    execute(params: IUpgradeParams): Promise<void>;
}

export const Upgrade = createAbstraction<IUpgrade>("Base/Upgrade");

export namespace Upgrade {
    export type Interface = IUpgrade;
    export type Params = IUpgradeParams;
}
