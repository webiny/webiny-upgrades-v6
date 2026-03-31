import { createFeature } from "../../../../utils/createFeature.js";
import { Upgrade } from "../../../../base/Upgrade/abstraction.js";
import type { Upgrade as UpgradeNS } from "../../../../base/Upgrade/abstraction.js";
import { Version } from "../../../../base/Version/index.js";

export default createFeature({
    name: "Fixture/6.0.1",
    register(container) {
        container.register(
            Upgrade.createImplementation({
                implementation: class implements UpgradeNS.Interface {
                    public readonly version = Version.create("6.0.1");
                    public async canHandle({
                        targetVersion,
                        currentVersion
                    }: UpgradeNS.Params): Promise<boolean> {
                        return this.version.between(currentVersion, targetVersion);
                    }
                    public async execute(): Promise<void> {}
                },
                dependencies: []
            })
        );
    }
});
