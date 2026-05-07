import { Upgrade as UpgradeAbstraction } from "../../base/Upgrade/index.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";
import { WebinyConfigTool } from "../../tool/WebinyConfigTool/index.js";
import { PackageManagerService } from "../../service/PackageManager/index.js";
import { Version } from "../../base/Version/index.js";

class UpgradeImpl implements UpgradeAbstraction.Interface {
    public readonly version = Version.create("6.3.0");

    public constructor(
        private readonly packageJsonTool: PackageJsonTool.Interface,
        private readonly webinyConfigTool: WebinyConfigTool.Interface,
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
        packageJson.setDevDependency("typescript", "6.0.3");
        this.packageJsonTool.save(packageJson);

        const webinyConfig = this.webinyConfigTool.read();
        webinyConfig.jsx.addChild("Infra.Env.IsProd", {
            comment: "Encryption MUST always be configured for production environments.",
            children: children => {
                children.addChild("Infra.Encryption", {
                    props: {
                        passphrase: 'process.env.WEBINY_ENCRYPTION_PASSPHRASE || ""'
                    }
                });
            }
        });
        this.webinyConfigTool.save(webinyConfig);

        if (this.packageManagerService.name() === "yarn") {
            await this.packageManagerService.update("4.14.1");
        }
    }
}

export const Upgrade = UpgradeAbstraction.createImplementation({
    implementation: UpgradeImpl,
    dependencies: [PackageJsonTool, WebinyConfigTool, PackageManagerService]
});
