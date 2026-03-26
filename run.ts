import path from "node:path";
import fs from "node:fs";
import semver from "semver";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { createContext } from "./src/context.js";
import log from "./src/utils/log.js";

interface PackageJson {
    version: string;
}

const argv = await yargs(hideBin(process.argv))
    .positional("version", { type: "string", describe: "Target upgrade version" })
    .option("cwd", { type: "string", describe: "Working directory" })
    .option("debug", { type: "boolean", default: false })
    .parse();

const response = (data: Record<string, unknown> | string): void => {
    console.log(JSON.stringify(data));
    process.exit(0);
};

const forcePatchVersion = (version: string): string => {
    const value = semver.coerce(version);
    if (!value) {
        return version;
    }
    return `${value.major}.${value.minor}.0`;
};

const getCliVersion = async (cwd: string): Promise<string | undefined> => {
    try {
        const packageJsonPath = path.join(cwd, "node_modules", "@webiny/cli/package.json");
        const raw = fs.readFileSync(packageJsonPath, "utf-8");
        const pkg = JSON.parse(raw) as PackageJson;
        return pkg.version;
    } catch {
        return undefined;
    }
};

const [version] = argv._ as string[];
const cwd = argv.cwd ?? process.cwd();
const start = Date.now();

try {
    if (!version) {
        throw new Error(`Missing positional "version" argument.`);
    }

    const forcedVersion = forcePatchVersion(version);
    const cliVersion = await getCliVersion(cwd);

    log.setDebug(argv.debug);

    if (cliVersion && forcedVersion !== cliVersion) {
        log.debug(
            `Running upgrade script for "${forcedVersion}", which differs from CLI version "${cliVersion}".`
        );
        log.debug(`This is intentional — we always run the "0" patch version upgrade script.`);
    }

    const scriptPath = path.join(import.meta.dirname, "upgrades", forcedVersion, "index.ts");
    if (!fs.existsSync(scriptPath)) {
        response({
            type: "error",
            message: "Upgrade script does not exist.",
            code: "SCRIPT_DOES_NOT_EXIST",
            data: { version, forcedVersion, scriptPath }
        });
    }

    const context = createContext({ root: cwd, version, log });
    const runner = await import(scriptPath);
    await runner.default(context);

    const duration = (Date.now() - start) / 1000;
    log.success(`Upgrade completed in %ss.`, duration);

    response({ type: "success", message: "", error: null });
} catch (e) {
    const err = e as Error;
    const duration = (Date.now() - start) / 1000;
    log.error(`Upgrade failed in %ss.`, duration);

    response({
        type: "error",
        message: err.message,
        code: "ERROR",
        data: { stack: err.stack }
    });
}
