import {
    PackageManagerService as PackageManagerServiceAbstraction,
    PackageManager
} from "./abstraction.js";
import { Timer } from "../../base/Timer/index.js";
import { Logger } from "../../base/Logger/index.js";

class PackageManagerServiceImpl implements PackageManagerServiceAbstraction.Interface {
    constructor(
        private readonly packageManager: PackageManager.Interface,
        private readonly timer: Timer.Interface,
        private readonly logger: Logger.Interface
    ) {}

    public async install(): PackageManagerServiceAbstraction.InstallResponse {
        this.logger.info("Installing packages...");
        await this.timer.execute("PackageManagerService.install", async () => {
            return await this.packageManager.install();
        });
    }

    public async version(): PackageManagerServiceAbstraction.VersionResponse {
        return await this.packageManager.version();
    }
}

export const PackageManagerService = PackageManagerServiceAbstraction.createImplementation({
    implementation: PackageManagerServiceImpl,
    dependencies: [PackageManager, Timer, Logger]
});
