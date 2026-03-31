import { createAbstraction } from "../../utils/createAbstraction.js";
import { Version } from "../../base/Version/index.js";

interface IUpgradeHandlerParams {
    version: Version;
}

interface IUpgradeHandler {
    handle(params: IUpgradeHandlerParams): Promise<void>;
}

export const UpgradeHandler = createAbstraction<IUpgradeHandler>("Base/UpgradeHandler");

export namespace UpgradeHandler {
    export type Interface = IUpgradeHandler;
    export type Params = IUpgradeHandlerParams;
}
