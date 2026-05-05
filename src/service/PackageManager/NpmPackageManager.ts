import { execa } from "execa";
import { Version } from "../../base/Version/index.js";
import { PackageManager as PackageManagerAbstraction } from "./abstraction.js";
import { Logger } from "../../base/Logger/index.js";

class NpmImpl implements PackageManagerAbstraction.Interface {
    public constructor(private readonly logger: Logger.Interface) {}

    public async install(): Promise<void> {
        try {
            await execa("npm", ["install"], { stdio: "inherit" });
        } catch (ex: any) {
            this.logger.error(ex.message);
            throw ex;
        }
    }

    public async version(): Promise<Version> {
        const { stdout } = await execa("npm", ["--version"]);
        return Version.create(stdout.trim());
    }

    public async update(version: string): Promise<void> {
        try {
            await execa("npm", ["install", "-g", `npm@${version}`], { stdio: "inherit" });
        } catch (ex: any) {
            this.logger.error(ex.message);
            throw ex;
        }
    }
}

export const NpmPackageManager = PackageManagerAbstraction.createImplementation({
    implementation: NpmImpl,
    dependencies: [Logger]
});
