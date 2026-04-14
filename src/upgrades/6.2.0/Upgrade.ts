import { Upgrade as UpgradeAbstraction } from "../../base/Upgrade/index.js";
import { UpWebiny } from "../../tool/UpWebiny/index.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";
import { Version } from "../../base/Version/index.js";

class UpgradeImpl implements UpgradeAbstraction.Interface {
    public readonly version = Version.create("6.2.0");

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
        const packageJson = this.packageJsonTool.load();
        if (!packageJson) {
            throw new Error(`Failed to load package.json`);
        }
        packageJson.setDependency("react", "18.3.1");
        packageJson.setDependency("react-dom", "18.3.1");

        packageJson.setDevDependency("@types/node", "24.12.2");
        packageJson.setDevDependency("@types/react", "18.3.28");
        packageJson.setDevDependency("@types/react-dom", "18.3.7");

        this.packageJsonTool.save(packageJson);
    }
}

export const Upgrade = UpgradeAbstraction.createImplementation({
    implementation: UpgradeImpl,
    dependencies: [UpWebiny, PackageJsonTool]
});
