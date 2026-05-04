import fs from "node:fs";
import path from "node:path";
import { Upgrade as UpgradeAbstraction } from "../../base/Upgrade/index.js";
import { Context } from "../../base/Context/index.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";
import { PackageManagerService } from "../../service/PackageManager/index.js";
import { Version } from "../../base/Version/index.js";

interface YarnBinaryInfo {
    version: string;
    srcPath: string;
}

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

    private getYarnBinaryInfo(): YarnBinaryInfo | null {
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

        const filename = String(match);
        return {
            version: path.basename(filename, ".cjs").slice("yarn-".length),
            srcPath: path.join(binDir, filename)
        };
    }

    private copyYarnBinary(version: string, srcPath: string): void {
        const releasesDir = this.context.resolve(".yarn", "releases");
        if (!fs.existsSync(releasesDir)) {
            return;
        }
        fs.copyFileSync(srcPath, path.join(releasesDir, `yarn-${version}.cjs`));
    }

    private updateYarnrc(version: string): void {
        const yarnrcPath = this.context.resolve(".yarnrc.yml");
        if (!fs.existsSync(yarnrcPath)) {
            return;
        }
        const content = fs.readFileSync(yarnrcPath, "utf-8");
        const updated = content.replace(
            /^yarnPath:.*$/m,
            `yarnPath: .yarn/releases/yarn-${version}.cjs`
        );
        fs.writeFileSync(yarnrcPath, updated, "utf-8");
    }

    public async execute(): Promise<void> {
        const packageJson = this.packageJsonTool.loadOrThrow();
        packageJson.setDevDependency("typescript", "6.0.3");

        if (this.packageManagerService.name() === "yarn") {
            const info = this.getYarnBinaryInfo();
            if (info) {
                packageJson.set("packageManager", `yarn@${info.version}`);
                this.copyYarnBinary(info.version, info.srcPath);
                this.updateYarnrc(info.version);
            }
        }

        this.packageJsonTool.save(packageJson);
    }
}

export const Upgrade = UpgradeAbstraction.createImplementation({
    implementation: UpgradeImpl,
    dependencies: [PackageJsonTool, PackageManagerService, Context]
});
