import { Version } from "./base/Version/index.js";
import { Container } from "@webiny/di";
import { Logger, LoggerFeature } from "./base/Logger/index.js";
import { InputFeature } from "./base/Input/index.js";
import { PackageJsonFeature, PackageJsonService } from "./service/PackageJson/index.js";
import { PackageManagerFeature } from "./service/PackageManager/index.js";
import { RegistryFeature, RegistryService } from "./service/Registry/index.js";
import { ContextFeature } from "./base/Context/index.js";
import { ContainerFeature } from "./base/Container/index.js";
import { GitFeature } from "./service/Git/index.js";
import { UpWebinyFeature } from "./tool/UpWebiny/index.js";
import { PackageJsonToolFeature } from "./tool/PackageJsonTool/index.js";
import { DependencyGuardFeature } from "./tool/DependencyGuard/index.js";
import { UpgradeHistoryFeature } from "./tool/UpgradeHistory/index.js";
import { UpgradeHandlerFeature } from "./service/UpgradeHandler/index.js";
import { UpgradeRunnerFeature } from "./service/UpgradeRunner/index.js";
import { ApplicationFeature } from "./base/Application/index.js";
import { Responder, ResponderFeature } from "./base/Responder/index.js";
import { TimerFeature } from "./base/Timer/index.js";
import { ReferencesFeature } from "./service/References/index.js";

interface ICreateContainerParams {
    version: string;
    logLevel: "debug" | "info" | "warn" | "error";
    json: boolean;
    forceUpgrade: boolean;
    registry: string;
    cwd: string;
    packageManager?: "yarn" | "pnpm" | "npm";
    skipDependencyGuard: boolean;
    dryRun: boolean;
    installVersion?: string;
    joinPath: (...segments: string[]) => string;
}

interface IResolveTargetVersionParams {
    container: Container;
    version: string;
}

const resolveTargetVersion = async (params: IResolveTargetVersionParams): Promise<Version> => {
    const { container, version } = params;
    const npm = container.resolve(RegistryService);
    if (!version || version === "latest") {
        const result = await npm.getLatestVersion("webiny");
        if (!result) {
            throw new Error("Failed to fetch latest version of Webiny.");
        }
        return result;
    }
    const result = await npm.getVersion("webiny", version);
    if (!result) {
        throw new Error(`Webiny version "${version}" does not exist in the registry.`);
    }
    return result;
};

interface ILoadInstalledVersionParams {
    container: Container;
    cwd: string;
    joinPath: (...segments: string[]) => string;
}

const loadInstalledVersion = (params: ILoadInstalledVersionParams): Version => {
    const { container, cwd, joinPath } = params;
    const packageJsonService = container.resolve(PackageJsonService);
    const packageJsonPath = joinPath(cwd, "node_modules", "webiny", "package.json");
    const packageJson = packageJsonService.load(packageJsonPath);
    if (!packageJson) {
        throw new Error(`Failed to load ${packageJsonPath}.`);
    }
    const installedVersion = Version.parse(packageJson.raw.version);
    if (!installedVersion) {
        throw new Error(
            `Failed to parse installed Webiny version from package.json: ${packageJson.raw.version}`
        );
    }
    return installedVersion;
};

export const createContainer = async (params: ICreateContainerParams): Promise<Container> => {
    const container = new Container();
    /**
     * Container — registers itself so it can be injected as a dependency.
     */
    ContainerFeature.register(container);

    /**
     * Infrastructure — no dependencies on other features.
     */
    LoggerFeature.register(container, {
        logLevel: params.logLevel,
        json: params.json
    });
    /**
     * Responder — handles process termination and termination signal output.
     */
    ResponderFeature.register(container);
    TimerFeature.register(container);
    InputFeature.register(container, params);

    /**
     * Services — depend on infrastructure only.
     */
    PackageJsonFeature.register(container);
    PackageManagerFeature.register(container);
    RegistryFeature.register(container);
    ReferencesFeature.register(container);

    const logger = container.resolve(Logger);
    /**
     * Context — pre-compute async data, then register synchronously.
     */
    const responder = container.resolve(Responder);
    let targetVersion: Version | null = null;
    let installedVersion: Version | null = null;
    try {
        logger.debug("Resolving target version...");
        /**
         * Validate the version that will be installed against the registry.
         * When --install-version is set, that is validated; otherwise the positional version.
         */
        const resolved = await resolveTargetVersion({
            container,
            version: params.installVersion || params.version
        });
        /**
         * targetVersion drives canHandle pool building.
         * When --install-version is set, the positional arg is used (may not exist in registry).
         * Otherwise, use whatever the registry resolved (handles "latest" → actual version).
         */
        if (params.installVersion) {
            const parsed = Version.parse(params.version);
            if (!parsed) {
                throw new Error(`Invalid version: "${params.version}".`);
            }
            targetVersion = parsed;
        } else {
            targetVersion = resolved;
        }
        logger.debug(`Target version resolved: ${targetVersion.raw}`);
        logger.debug("Loading installed version...");
        installedVersion = loadInstalledVersion({
            container,
            cwd: params.cwd,
            joinPath: params.joinPath
        });
        logger.debug(`Installed version loaded: ${installedVersion.raw}`);
    } catch (ex) {
        responder.error(ex.message, 0);
        // Dead at runtime (responder.error is `never`), kept so TS can narrow
        // targetVersion/installedVersion to non-null after the try/catch.
        process.exit();
    }
    ContextFeature.register(container, {
        cwd: params.cwd,
        registry: params.registry,
        inputVersion: params.version,
        targetVersion,
        installedVersion
    });

    /**
     * Tools — depend on services and context.
     */
    GitFeature.register(container);
    UpWebinyFeature.register(container);
    PackageJsonToolFeature.register(container);
    DependencyGuardFeature.register(container);
    UpgradeHistoryFeature.register(container);

    /**
     * Handler — depends on everything above.
     */
    UpgradeHandlerFeature.register(container);

    /**
     * Runner — depends on context, handler, and tools. Loads and executes the upgrade script.
     */
    UpgradeRunnerFeature.register(container);

    /**
     * Application — top-level orchestrator. Runs the upgrade and handles responses.
     */
    ApplicationFeature.register(container);

    return container;
};
