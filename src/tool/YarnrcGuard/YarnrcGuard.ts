import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { YarnrcGuard as YarnrcGuardAbstraction } from "./abstraction.js";
import { YarnrcGuardError } from "./YarnrcGuardError.js";
import { Context } from "../../base/Context/index.js";
import { Logger } from "../../base/Logger/index.js";

const REQUIRED_SETTINGS = [
    "approvedGitRepositories",
    "enableScripts",
    "npmMinimalAgeGate",
    "npmPreapprovedPackages"
] as const;

class YarnrcGuardImpl implements YarnrcGuardAbstraction.Interface {
    public constructor(
        private readonly context: Context.Interface,
        private readonly logger: Logger.Interface
    ) {}

    public execute({ targetVersion, breakOnVersion }: YarnrcGuardAbstraction.Params): void {
        const yarnrcPath = path.join(this.context.cwd, ".yarnrc.yml");
        const missing = this.findMissingSettings(yarnrcPath);
        if (missing.length === 0) {
            return;
        }

        if (targetVersion.gte(breakOnVersion)) {
            throw new YarnrcGuardError(missing);
        }

        this.logger.info("The following .yarnrc.yml security settings are not configured:");
        for (const setting of missing) {
            this.logger.info(`  - ${setting}`);
        }
        this.logger.info(
            `Starting with version ${breakOnVersion.raw}, these settings will be required to upgrade.`
        );
        this.logger.info(
            "See https://www.webiny.com/docs/infrastructure/yarnrc-security.md for details."
        );
    }

    private findMissingSettings(yarnrcPath: string): string[] {
        if (!fs.existsSync(yarnrcPath)) {
            return [...REQUIRED_SETTINGS];
        }

        const content = fs.readFileSync(yarnrcPath, "utf-8");
        const parsed = yaml.load(content);
        if (typeof parsed !== "object" || parsed === null) {
            return [...REQUIRED_SETTINGS];
        }

        const config = parsed as Record<string, unknown>;
        return REQUIRED_SETTINGS.filter(key => !(key in config));
    }
}

export const YarnrcGuard = YarnrcGuardAbstraction.createImplementation({
    implementation: YarnrcGuardImpl,
    dependencies: [Context, Logger]
});
