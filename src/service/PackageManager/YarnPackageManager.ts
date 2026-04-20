import { execa } from "execa";
import { Version } from "../../base/Version/index.js";
import { PackageManager as PackageManagerAbstraction } from "./abstraction.js";
import { Logger } from "../../base/Logger/index.js";

class YarnImpl implements PackageManagerAbstraction.Interface {
    public constructor(private readonly logger: Logger.Interface) {}

    public async install(): Promise<void> {
        try {
            await execa("yarn", [], { stdio: "pipe" });
        } catch (ex: any) {
            this.logger.error(ex.stderr || ex.message);
            throw ex;
        }
    }

    public async version(): Promise<Version> {
        const { stdout } = await execa("yarn", ["--version"]);
        return Version.create(stdout.trim());
    }
}

export const YarnPackageManager = PackageManagerAbstraction.createImplementation({
    implementation: YarnImpl,
    dependencies: [Logger]
});
