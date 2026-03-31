import zod from "zod";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const DEFAULT_REGISTRY = "https://registry.npmjs.org";

const schema = zod
    .object({
        _: zod
            .tuple([zod.string().optional()])
            .transform(input => {
                if (!input?.length) {
                    return "latest";
                }
                return input[0] || "latest";
            })
            .optional()
            .default("latest"),
        cwd: zod.string().optional(),
        logLevel: zod.enum(["debug", "info", "warn", "error"]).default("error"),
        json: zod.boolean(),
        force: zod.boolean(),
        registry: zod.url(),
        "package-manager": zod.enum(["yarn", "pnpm", "npm"]).optional(),
        "skip-dependency-guard": zod.boolean().default(true),
        "dry-run": zod.boolean().default(false)
    })
    .transform(
        ({
            _,
            logLevel,
            json,
            force,
            registry,
            cwd,
            "package-manager": packageManager,
            "skip-dependency-guard": skipDependencyGuard,
            "dry-run": dryRun
        }) => ({
            version: _,
            cwd,
            logLevel,
            json,
            forceUpgrade: force,
            registry,
            packageManager,
            skipDependencyGuard,
            dryRun
        })
    );

interface IGetUserInputParams {
    cwd: string;
}

type PackageManagerOption = "yarn" | "pnpm" | "npm";

interface IGetUserInputResult {
    version: string;
    logLevel: "debug" | "info" | "warn" | "error";
    json: boolean;
    forceUpgrade: boolean;
    registry: string;
    cwd: string;
    packageManager?: PackageManagerOption;
    skipDependencyGuard: boolean;
    dryRun: boolean;
}

export const getUserInput = (params: IGetUserInputParams): IGetUserInputResult => {
    const input = yargs(hideBin(process.argv))
        .version(false)
        .positional("version", {
            type: "string",
            describe: "Target upgrade version.",
            default: "latest"
        })
        .option("cwd", {
            type: "string",
            describe: "Working directory"
        })
        .option("log-level", {
            type: "string",
            default: "info",
            describe:
                "Set log level for the upgrade process executed by npx. Possible values are 'debug', 'info', 'warning', and 'error'."
        })
        .option("json", {
            type: "boolean",
            default: false,
            describe: "Output logs as NDJSON (one JSON object per line)"
        })
        .option("registry", {
            type: "string",
            default: DEFAULT_REGISTRY,
            describe: "npm registry URL"
        })
        .option("force", {
            type: "boolean",
            default: false,
            describe: "Force upgrade even if already ran"
        })
        .option("package-manager", {
            type: "string",
            describe:
                "Package manager to use: yarn, pnpm, or npm (auto-detected from lock file if omitted)"
        })
        .option("skip-dependency-guard", {
            type: "boolean",
            default: false,
            describe: "Skip the dependency guard check (not recommended)"
        })
        .option("dry-run", {
            type: "boolean",
            default: false,
            describe: "Do everything except actually performing the upgrade (for testing purposes)"
        })
        .parseSync();

    const result = schema.safeParse(input);
    if (!result.success) {
        console.error("Invalid arguments.");
        console.log(JSON.stringify(result.error));
        process.exit(1);
    }
    return {
        ...result.data,
        /**
         * If it is a dry run, we want to force log level to debug so that we can see all logs, even the ones that are normally hidden.
         */
        logLevel: result.data.dryRun ? "debug" : result.data.logLevel,
        cwd: result.data.cwd || params.cwd
    };
};
