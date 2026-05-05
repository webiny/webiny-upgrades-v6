import fs from "node:fs";
import path from "node:path";
import { execa } from "execa";
import { Version } from "../../base/Version/index.js";
import { PackageManager as PackageManagerAbstraction } from "./abstraction.js";
import { Logger } from "../../base/Logger/index.js";
import { Context } from "../../base/Context/index.js";

class YarnImpl implements PackageManagerAbstraction.Interface {
    public constructor(
        private readonly logger: Logger.Interface,
        private readonly context: Context.Interface
    ) {}

    private readYarnPath(): string | null {
        const yarnrcPath = path.join(this.context.cwd, ".yarnrc.yml");
        if (!fs.existsSync(yarnrcPath)) {
            return null;
        }
        const content = fs.readFileSync(yarnrcPath, "utf-8");
        const match = content.match(/^yarnPath:\s*(.+?)\s*$/m);
        if (!match) {
            return null;
        }
        return path.resolve(this.context.cwd, match[1]);
    }

    public async install(): Promise<void> {
        const yarnPath = this.readYarnPath();
        const [cmd, args]: [string, string[]] = yarnPath ? ["node", [yarnPath]] : ["yarn", []];
        try {
            await execa(cmd, args, { stdio: "inherit" });
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
    dependencies: [Logger, Context]
});
