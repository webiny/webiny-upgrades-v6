import { Upgrade } from "~/base/Upgrade/abstraction.js";
import { UpgradeHandler as UpgradeHandlerAbstraction } from "./abstraction.js";

/**
 * Upgrade handler is not actually needed at the moment as we just load and run the targeted upgrade version.
 * But let's keep it for now.
 */
class UpgradeHandlerImpl implements UpgradeHandlerAbstraction.Interface {
    public constructor(private webinyUpgrades: Upgrade.Interface[]) {}

    public async handle(params: UpgradeHandlerAbstraction.Params): Promise<void> {
        for (const webinyUpgrade of this.webinyUpgrades) {
            if (await webinyUpgrade.canHandle(params)) {
                return await webinyUpgrade.execute(params);
            }
        }
        throw new Error(`No Upgrade found that can handle version ${params.version}`);
    }
}

export const UpgradeHandler = UpgradeHandlerAbstraction.createImplementation({
    implementation: UpgradeHandlerImpl,
    dependencies: [[Upgrade, { multiple: true }]]
});
