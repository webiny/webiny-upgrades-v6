import { Upgrade as UpgradeAbstraction } from "../../base/Upgrade/index.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";
import { PackageManagerService } from "../../service/PackageManager/index.js";
import { Version } from "../../base/Version/index.js";

class UpgradeImpl implements UpgradeAbstraction.Interface {
    public readonly version = Version.create("6.5.0");

    public constructor(
        private readonly packageJsonTool: PackageJsonTool.Interface,
        private readonly packageManagerService: PackageManagerService.Interface
    ) {}

    public async canHandle({
        targetVersion,
        currentVersion
    }: UpgradeAbstraction.Params): Promise<boolean> {
        return this.version.between(currentVersion, targetVersion);
    }

    public async execute(): Promise<void> {
        const packageJson = this.packageJsonTool.loadOrThrow();
        packageJson.setDevDependency("@types/node", "^24.13.3");
        packageJson.setDevDependency("typescript", "7.0.2");
        this.packageJsonTool.save(packageJson);

        if (this.packageManagerService.name() === "yarn") {
            await this.packageManagerService.update("4.17.1");
        }
    }
}

export const Upgrade = UpgradeAbstraction.createImplementation({
    implementation: UpgradeImpl,
    dependencies: [PackageJsonTool, PackageManagerService]
});
