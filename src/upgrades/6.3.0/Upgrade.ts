import { Upgrade as UpgradeAbstraction } from "../../base/Upgrade/index.js";
import { UpWebiny } from "../../tool/UpWebiny/index.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";
import { Version } from "../../base/Version/index.js";

class UpgradeImpl implements UpgradeAbstraction.Interface {
    public readonly version = Version.create("6.3.0");

    public constructor(
        private readonly upWebiny: UpWebiny.Interface,
        private readonly packageJsonTool: PackageJsonTool.Interface
    ) {}

    public async canHandle({
        targetVersion,
        currentVersion
    }: UpgradeAbstraction.Params): Promise<boolean> {
        return this.version.between(currentVersion, targetVersion);
    }

    public async execute(): Promise<void> {
        await this.upWebiny.execute({ version: this.version });
        const packageJson = this.packageJsonTool.loadOrThrow();
        packageJson.setDevDependency("typescript", "6.0.2");

        this.packageJsonTool.save(packageJson);
    }
}

export const Upgrade = UpgradeAbstraction.createImplementation({
    implementation: UpgradeImpl,
    dependencies: [UpWebiny, PackageJsonTool]
});
