import { execa } from "execa";
import { Version } from "../../base/Version/index.js";
import { PackageManager as PackageManagerAbstraction } from "./abstraction.js";
import { Logger } from "../../base/Logger/index.js";

class PnpmImpl implements PackageManagerAbstraction.Interface {
    public constructor(private readonly logger: Logger.Interface) {}

    public async install(): Promise<void> {
        try {
            await execa("pnpm", ["install"], { stdio: "inherit" });
        } catch (ex: any) {
            this.logger.error(ex.message);
            throw ex;
        }
    }

    public async version(): Promise<Version> {
        const { stdout } = await execa("pnpm", ["--version"]);
        return Version.create(stdout.trim());
    }
}

export const PnpmPackageManager = PackageManagerAbstraction.createImplementation({
    implementation: PnpmImpl,
    dependencies: [Logger]
});
