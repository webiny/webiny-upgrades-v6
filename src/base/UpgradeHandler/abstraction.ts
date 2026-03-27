import { createAbstraction } from "~/utils/createAbstraction.js";
import type { SemVer } from "semver";

interface IUpgradeHandlerParams {
    version: SemVer;
}

interface IUpgradeHandler {
    handle(params: IUpgradeHandlerParams): Promise<void>;
}

export const UpgradeHandler = createAbstraction<IUpgradeHandler>("Base/UpgradeHandler");

export namespace UpgradeHandler {
    export type Interface = IUpgradeHandler;
    export type Params = IUpgradeHandlerParams;
}
