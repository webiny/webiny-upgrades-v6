import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { Version } from "../../base/Version/index.js";
import { UpgradeRunner as UpgradeRunnerAbstraction } from "./abstraction.js";
import { UpgradesDirectory } from "./UpgradesDirectory.js";
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
            throw new Error(`Upgrades directory does not exist: "${this.upgradesDir}".`);
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
            throw new Error(`No upgrade scripts found in "${this.upgradesDir}".`);
        }

        const sorted = directories
            .map(entry => {
                const parsed = Version.parse(entry.name);
                if (!parsed) {
                    throw new Error(
                        `Upgrade directory "${entry.name}" is not a valid semver version.`
                    );
                }
                return { parsed, name: entry.name };
            })
            .sort((a, b) => a.parsed.compareTo(b.parsed));

        for (const { name } of sorted) {
            const indexPath = path.join(this.upgradesDir, name, "index.ts");

            if (!fs.existsSync(indexPath)) {
                throw new Error(`Upgrade directory "${name}" is missing an index.ts file.`);
            }

            const mod = (await import(pathToFileURL(indexPath).href)) as IRunner | null;
            if (!isFeature(mod?.default)) {
                throw new Error(
                    `Upgrade script "${name}/index.ts" does not export a valid feature.`
                );
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
