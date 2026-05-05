import { readFileSync, existsSync } from "node:fs";
import { mkdtemp, cp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { onTestFinished, vi } from "vitest";
import { Container as DIContainer } from "@webiny/di";
import { Container } from "../../base/Container/abstraction.js";
import { Context } from "../../base/Context/abstraction.js";
import { Input } from "../../base/Input/abstraction.js";
import { Logger } from "../../base/Logger/abstraction.js";
import { Version } from "../../base/Version/index.js";
import { Git } from "../../service/Git/abstraction.js";
import { PackageManagerService } from "../../service/PackageManager/abstraction.js";
import type { PackageManagerName as IPackageManagerName } from "../../service/PackageManager/detect.js";
import { RegistryService } from "../../service/Registry/abstraction.js";
import { ReferencesService } from "../../service/References/abstractions.js";
import { PackageJsonService as PackageJsonServiceImpl } from "../../service/PackageJson/PackageJsonService.js";
import { UpgradeHandler } from "../../service/UpgradeHandler/UpgradeHandler.js";
import { UpgradeRunner } from "../../service/UpgradeRunner/abstraction.js";
import { UpgradeRunner as UpgradeRunnerImpl } from "../../service/UpgradeRunner/UpgradeRunner.js";
import { UpgradesDirectory } from "../../service/UpgradeRunner/UpgradesDirectory.js";
import { DependencyGuard } from "../../tool/DependencyGuard/abstraction.js";
import { PackageJsonTool as PackageJsonToolImpl } from "../../tool/PackageJsonTool/PackageJsonTool.js";
import { UpgradeHistory } from "../../tool/UpgradeHistory/abstraction.js";
import { UpgradeHistory as UpgradeHistoryImpl } from "../../tool/UpgradeHistory/UpgradeHistory.js";
import { UpWebiny } from "../../tool/UpWebiny/abstraction.js";
import { UpWebiny as UpWebinyImpl } from "../../tool/UpWebiny/UpWebiny.js";
import { createMockLogger } from "./mockLogger.js";
import type { PackageJsonFile as PackageJsonFileNS } from "../../service/PackageJson/abstraction.js";

interface IParams {
    fixtureDir: string;
    currentVersion: string;
    targetVersion: string;
    upgradesDir?: string;
}

interface IHarness {
    run(): Promise<void>;
    readPackageJson(): PackageJsonFileNS.Data;
    readFile(relPath: string): string;
    tmpDir: string;
    upWebiny: UpWebiny.Interface;
    upgradeHistory: UpgradeHistory.Interface;
}

const DEFAULT_UPGRADES_DIR = path.join(import.meta.dirname, "..", "..", "upgrades");

export const createUpgradeIntegrationHarness = async (params: IParams): Promise<IHarness> => {
    const upgradesDir = params.upgradesDir ?? DEFAULT_UPGRADES_DIR;
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "webiny-upgrade-"));
    await cp(params.fixtureDir, tmpDir, { recursive: true });

    onTestFinished(async () => {
        await rm(tmpDir, { recursive: true, force: true });
    });

    const detectedPackageManager: IPackageManagerName = existsSync(path.join(tmpDir, "yarn.lock"))
        ? "yarn"
        : existsSync(path.join(tmpDir, "pnpm-lock.yaml"))
          ? "pnpm"
          : "npm";

    const container = new DIContainer();
    container.registerInstance(Container, container);

    const ctx: Context.Interface = {
        cwd: tmpDir,
        registry: "https://registry.npmjs.org",
        inputVersion: params.targetVersion,
        targetVersion: Version.create(params.targetVersion),
        installedVersion: Version.create(params.currentVersion),
        currentVersion: Version.create(params.currentVersion),
        setCurrentVersion(version: Version) {
            ctx.currentVersion = version;
        },
        resolve(...segments: string[]) {
            return path.join(tmpDir, ...segments);
        }
    };
    container.registerInstance(Context, ctx);

    container.registerInstance(Logger, createMockLogger());

    container.registerInstance(Input, {
        cwd: tmpDir,
        registry: "https://registry.npmjs.org",
        version: params.targetVersion,
        logLevel: "error",
        json: false,
        forceUpgrade: false,
        skipDependencyGuard: true,
        dryRun: false
    });

    container.registerInstance(Git, {
        isClean: vi.fn().mockResolvedValue(true),
        restore: vi.fn().mockResolvedValue(undefined)
    });

    container.registerInstance(PackageManagerService, {
        install: vi.fn().mockResolvedValue(undefined),
        version: vi.fn(),
        name: vi.fn().mockReturnValue(detectedPackageManager),
        update: vi.fn().mockResolvedValue(undefined)
    });

    container.registerInstance(RegistryService, {
        getLatestVersion: vi.fn().mockResolvedValue(null),
        getVersion: vi.fn().mockResolvedValue(null)
    });

    container.registerInstance(ReferencesService, {
        getReference: vi.fn().mockReturnValue(null),
        getVersion: vi.fn().mockReturnValue(null)
    });

    container.registerInstance(DependencyGuard, {
        execute: vi.fn().mockReturnValue([])
    });

    container.registerInstance(UpgradesDirectory, upgradesDir);

    container.register(PackageJsonServiceImpl);
    container.register(PackageJsonToolImpl);
    container.register(UpWebinyImpl);
    container.register(UpgradeHistoryImpl);
    container.register(UpgradeHandler);
    container.register(UpgradeRunnerImpl);

    const upWebiny = container.resolve(UpWebiny);
    vi.spyOn(upWebiny, "execute");

    const upgradeHistory = container.resolve(UpgradeHistory);
    vi.spyOn(upgradeHistory, "add");
    vi.spyOn(upgradeHistory, "get");
    vi.spyOn(upgradeHistory, "list");
    vi.spyOn(upgradeHistory, "remove");

    return {
        async run() {
            const runner = container.resolve(UpgradeRunner);
            await runner.run();
        },
        readPackageJson(): PackageJsonFileNS.Data {
            const raw = readFileSync(path.join(tmpDir, "package.json"), "utf-8");
            return JSON.parse(raw);
        },
        readFile(relPath: string): string {
            return readFileSync(path.join(tmpDir, relPath), "utf-8");
        },
        tmpDir,
        upWebiny,
        upgradeHistory
    };
};
