import { createAbstraction } from "../../utils/createAbstraction.js";
import { Version } from "../Version/index.js";

interface IUpgradeParams {
    /**
     * @description The version that the user wants to upgrade to. This can be used to determine if an upgrade should be executed or not.
     */
    targetVersion: Version;
    /**
     * @description The version that is currently installed. This can be used to determine if an upgrade should be executed or not.
     */
    currentVersion: Version;
}

interface IUpgrade {
    readonly version: Version;
    canHandle(params: IUpgradeParams): Promise<boolean>;
    execute(): Promise<void>;
}

export const Upgrade = createAbstraction<IUpgrade>("Base/Upgrade");

export namespace Upgrade {
    export type Interface = IUpgrade;
    export type Params = IUpgradeParams;
}
