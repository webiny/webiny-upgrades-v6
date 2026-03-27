import { Upgrade as UpgradeAbstraction } from "~/base/Upgrade/index.js";
import { UpWebiny } from "~/tool/UpWebiny/index.js";

class UpgradeImpl implements UpgradeAbstraction.Interface {
    public constructor(private readonly upWebiny: UpWebiny.Interface) {}

    public async canHandle({ version }: UpgradeAbstraction.Params): Promise<boolean> {
        return version.format() === "6.0.0";
    }

    public async execute(params: UpgradeAbstraction.Params): Promise<void> {
        await this.upWebiny.execute({
            version: params.version,
            executeYarn: true
        });
    }
}

export const Upgrade = UpgradeAbstraction.createImplementation({
    implementation: UpgradeImpl,
    dependencies: [UpWebiny]
});
