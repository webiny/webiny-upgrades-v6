import { execa } from "execa";
import { Version } from "../../base/Version/index.js";
import { PackageManager as PackageManagerAbstraction } from "./abstraction.js";
import { Logger } from "../../base/Logger/index.js";

class NpmImpl implements PackageManagerAbstraction.Interface {
    public constructor(private readonly logger: Logger.Interface) {}

    public async install(): Promise<void> {
        try {
            await execa("npm", ["install"], { stdio: "pipe" });
        } catch (ex: any) {
            this.logger.error(ex.stderr || ex.message);
            throw ex;
        }
    }

    public async version(): Promise<Version> {
        const { stdout } = await execa("npm", ["--version"]);
        const result = Version.parse(stdout.trim());
        if (!result) {
            throw new Error(`Failed to parse npm version: ${stdout.trim()}`);
        }
        return result;
    }
}

export const NpmPackageManager = PackageManagerAbstraction.createImplementation({
    implementation: NpmImpl,
    dependencies: [Logger]
});
