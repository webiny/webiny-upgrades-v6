import { Upgrade } from "../../base/Upgrade/abstraction.js";
import { DirtyGitRepositoryError } from "./DirtyGitRepositoryError.js";
import { UpgradeHandler as UpgradeHandlerAbstraction } from "./abstraction.js";
import { Context } from "../../base/Context/index.js";
import { Logger } from "../../base/Logger/index.js";
import { Git } from "../Git/index.js";
import { PackageManagerService } from "../PackageManager/index.js";
import { UpWebiny } from "../../tool/UpWebiny/index.js";
import { Input } from "../../base/Input/index.js";
import { UpgradeHistory } from "../../tool/UpgradeHistory/index.js";
import { Version } from "../../base/Version/index.js";

class UpgradeHandlerImpl implements UpgradeHandlerAbstraction.Interface {
    public constructor(
        private readonly upgrades: Upgrade.Interface[],
        private readonly context: Context.Interface,
        private readonly logger: Logger.Interface,
        private readonly git: Git.Interface,
        private readonly packageManagerService: PackageManagerService.Interface,
        private readonly upWebiny: UpWebiny.Interface,
        private readonly input: Input.Interface,
        private readonly upgradeHistory: UpgradeHistory.Interface
    ) {}

    public async handle(params: UpgradeHandlerAbstraction.Params): Promise<void> {
        const isClean = await this.git.isClean();
        if (!isClean) {
            throw new DirtyGitRepositoryError();
        }

        const upgradeParams: Upgrade.Params = {
            targetVersion: params.version,
            currentVersion: this.context.currentVersion
        };

        const pool: Upgrade.Interface[] = [];
        for (const upgrade of this.upgrades) {
            if (this.input.forceUpgrade) {
                if (
                    upgrade.version.gte(this.context.currentVersion) &&
                    upgrade.version.lte(params.version)
                ) {
                    pool.push(upgrade);
                }
                continue;
            }
            const canHandle = await upgrade.canHandle(upgradeParams);
            if (!canHandle) {
                continue;
            }
            const inHistory = this.upgradeHistory.get(upgrade.version);
            if (inHistory) {
                this.logger.debug(
                    `Upgrade ${upgrade.version.format()} already executed, skipping.`
                );
                continue;
            }
            pool.push(upgrade);
        }

        if (pool.length === 0) {
            this.logger.info(
                `No upgrades found that can handle version ${params.version.format()}.`
            );
        } else {
            const versions = pool.map(u => u.version.format()).join(", ");
            this.logger.debug(`Found ${pool.length} upgrade(s) to execute: ${versions}`);

            if (this.input.dryRun) {
                return;
            }
            try {
                for (const upgrade of pool) {
                    this.logger.debug(`Running upgrade ${upgrade.version.format()}...`);
                    await upgrade.execute();
                    if (!this.upgradeHistory.get(upgrade.version)) {
                        this.upgradeHistory.add(upgrade.version);
                    }
                    this.context.setCurrentVersion(upgrade.version);
                }
            } catch (error) {
                this.logger.error("Upgrade failed, reverting changes...");
                await this.git.restore();
                throw error;
            }
        }

        const installVersion = this.input.installVersion
            ? Version.create(this.input.installVersion)
            : params.version;
        this.upWebiny.execute({ version: installVersion });
        await this.packageManagerService.install();

        if (!this.upgradeHistory.get(params.version)) {
            this.upgradeHistory.add(params.version);
        }
    }
}

export const UpgradeHandler = UpgradeHandlerAbstraction.createImplementation({
    implementation: UpgradeHandlerImpl,
    dependencies: [
        [Upgrade, { multiple: true }],
        Context,
        Logger,
        Git,
        PackageManagerService,
        UpWebiny,
        Input,
        UpgradeHistory
    ]
});
