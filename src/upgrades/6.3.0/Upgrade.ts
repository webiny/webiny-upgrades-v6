import fs from "node:fs";
import path from "node:path";
import { Upgrade as UpgradeAbstraction } from "../../base/Upgrade/index.js";
import { Context } from "../../base/Context/index.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";
import { PackageManagerService } from "../../service/PackageManager/index.js";
import { Version } from "../../base/Version/index.js";

class UpgradeImpl implements UpgradeAbstraction.Interface {
    public readonly version = Version.create("6.3.0");

    public constructor(
        private readonly packageJsonTool: PackageJsonTool.Interface,
        private readonly packageManagerService: PackageManagerService.Interface,
        private readonly context: Context.Interface
    ) {}

    public async canHandle({
        targetVersion,
        currentVersion
    }: UpgradeAbstraction.Params): Promise<boolean> {
        return this.version.between(currentVersion, targetVersion);
    }

    private getYarnVersion(): string | null {
        const binDir = this.context.resolve(
            "node_modules",
            "@webiny",
            "create-webiny-project",
            "services",
            "SetupYarn",
            "binaries"
        );

        if (!fs.existsSync(binDir)) {
            return null;
        }

        const match = fs.readdirSync(binDir).find(f => /^yarn-.+\.cjs$/.test(String(f)));
        if (!match) {
            return null;
        }

        return path.basename(String(match), ".cjs").slice("yarn-".length);
    }

    public async execute(): Promise<void> {
        const packageJson = this.packageJsonTool.loadOrThrow();
        packageJson.setDevDependency("typescript", "6.0.3");

        if (this.packageManagerService.name() === "yarn") {
            const yarnVersion = this.getYarnVersion();
            if (yarnVersion) {
                packageJson.set("packageManager", `yarn@${yarnVersion}`);
            }
        }

        this.packageJsonTool.save(packageJson);
    }
}

export const Upgrade = UpgradeAbstraction.createImplementation({
    implementation: UpgradeImpl,
    dependencies: [PackageJsonTool, PackageManagerService, Context]
});
