import { LoggerFeature } from "~/service/Logger/index.js";
import { Container } from "@webiny/di";
import { InputFeature } from "~/base/Input/index.js";
import { NpmFeature } from "~/service/Npm/index.js";
import { YarnFeature } from "~/service/Yarn/index.js";
import { UpgradeHandlerFeature } from "~/base/UpgradeHandler/index.js";
import { PackageJsonFeature } from "~/service/PackageJson/index.js";

interface ICreateContainerParams {
    version: string;
    debug: boolean;
    registry: string;
    cwd: string;
}

export const createContainer = (params: ICreateContainerParams) => {
    const container = new Container();
    /**
     * Basic features first. These have no dependencies on other features, so we can register them first.
     */
    LoggerFeature.register(container, {
        debug: params.debug || false
    });
    InputFeature.register(container, params);
    UpgradeHandlerFeature.register(container);

    YarnFeature.register(container);
    NpmFeature.register(container);
    PackageJsonFeature.register(container);

    return container;
};
