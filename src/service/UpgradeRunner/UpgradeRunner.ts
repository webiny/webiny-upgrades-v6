import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { Version } from "../../base/Version/index.js";
import { UpgradeRunner as UpgradeRunnerAbstraction } from "./abstraction.js";
import { UpgradesDirectory } from "./UpgradesDirectory.js";
import { UpgradeFeatureExportError } from "./UpgradeFeatureExportError.js";
import { UpgradeIndexMissingError } from "./UpgradeIndexMissingError.js";
import { UpgradesDirectoryEmptyError } from "./UpgradesDirectoryEmptyError.js";
import { UpgradesDirectoryNotFoundError } from "./UpgradesDirectoryNotFoundError.js";
import { UpgradeHandler } from "../UpgradeHandler/index.js";
import { Container } from "../../base/Container/index.js";
import { Context } from "../../base/Context/index.js";
import { isFeature } from "../../utils/createFeature.js";

const EXCLUDED_DIRS = new Set(["__tests__"]);

interface IRunner {
    default?: unknown;
}

class UpgradeRunnerImpl implements UpgradeRunnerAbstraction.Interface {
    public constructor(
        private readonly container: Container.Interface,
        private readonly context: Context.Interface,
        private readonly upgradesDir: string
    ) {}

    public async run(): Promise<void> {
        const { targetVersion } = this.context;

        if (!fs.existsSync(this.upgradesDir)) {
            throw new UpgradesDirectoryNotFoundError(this.upgradesDir);
        }

        const directories = fs
            .readdirSync(this.upgradesDir, { withFileTypes: true })
            .filter(entry => {
                if (entry.isDirectory() === false) {
                    return false;
                } else if (EXCLUDED_DIRS.has(entry.name)) {
                    return false;
                }
                return true;
            });

        if (directories.length === 0) {
            throw new UpgradesDirectoryEmptyError(this.upgradesDir);
        }

        const sorted = directories
            .map(entry => ({ parsed: Version.create(entry.name), name: entry.name }))
            .sort((a, b) => a.parsed.compareTo(b.parsed));

        for (const { name } of sorted) {
            const indexPath = path.join(this.upgradesDir, name, "index.ts");

            if (!fs.existsSync(indexPath)) {
                throw new UpgradeIndexMissingError(name);
            }

            const mod = (await import(pathToFileURL(indexPath).href)) as IRunner | null;
            if (!isFeature(mod?.default)) {
                throw new UpgradeFeatureExportError(name);
            }

            mod.default.register(this.container);
        }

        const handler = this.container.resolve(UpgradeHandler);
        await handler.handle({ version: targetVersion });
    }
}

export const UpgradeRunner = UpgradeRunnerAbstraction.createImplementation({
    implementation: UpgradeRunnerImpl,
    dependencies: [Container, Context, UpgradesDirectory]
});
