import { execa } from "execa";
import { Version } from "../../base/Version/index.js";
import { PackageManager as PackageManagerAbstraction } from "./abstraction.js";
import { Logger } from "../../base/Logger/index.js";

class YarnImpl implements PackageManagerAbstraction.Interface {
    public constructor(private readonly logger: Logger.Interface) {}

    public async install(): Promise<void> {
        try {
            await execa("yarn", [], { stdio: "inherit" });
        } catch (ex: any) {
            this.logger.error(ex.message);
            throw ex;
        }
    }

    public async version(): Promise<Version> {
        const { stdout } = await execa("yarn", ["--version"]);
        return Version.create(stdout.trim());
    }

    public async update(version: string): Promise<void> {
        try {
            await execa("yarn", ["set", "version", version], { stdio: "inherit" });
        } catch (ex: any) {
            this.logger.error(ex.message);
            throw ex;
        }
    }
}

export const YarnPackageManager = PackageManagerAbstraction.createImplementation({
    implementation: YarnImpl,
    dependencies: [Logger]
});
