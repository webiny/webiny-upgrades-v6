import { vi } from "vitest";
import { Container as DIContainer } from "@webiny/di";
import { Container } from "../../base/Container/abstraction.js";
import { Context } from "../../base/Context/abstraction.js";
import { Logger } from "../../base/Logger/abstraction.js";
import { Git } from "../../service/Git/abstraction.js";
import { PackageManagerService } from "../../service/PackageManager/abstraction.js";
import { UpWebiny } from "../../tool/UpWebiny/abstraction.js";
import { Input } from "../../base/Input/abstraction.js";
import { UpgradeHistory } from "../../tool/UpgradeHistory/abstraction.js";
import { UpgradeHandler } from "../../service/UpgradeHandler/UpgradeHandler.js";
import { UpgradeRunner } from "../../service/UpgradeRunner/UpgradeRunner.js";
import { UpgradesDirectory } from "../../service/UpgradeRunner/UpgradesDirectory.js";
import { Version } from "../../base/Version/index.js";
import { createMockLogger } from "./mockLogger.js";

interface IParams {
    upgradesDir: string;
    currentVersion: string;
    targetVersion: string;
}

export const createIntegrationContainer = ({
    upgradesDir,
    currentVersion,
    targetVersion
}: IParams) => {
    const container = new DIContainer();

    // Register the container itself so it can be injected into UpgradeRunner
    container.registerInstance(Container, container);

    // Context with mutable currentVersion
    const ctx: Context.Interface = {
        cwd: "/project",
        registry: "https://registry.npmjs.org",
        inputVersion: targetVersion,
        targetVersion: Version.create(targetVersion),
        installedVersion: Version.create(currentVersion),
        currentVersion: Version.create(currentVersion),
        setCurrentVersion: vi.fn((ver: Version) => {
            ctx.currentVersion = ver;
        }),
        resolve: vi.fn()
    };
    container.registerInstance(Context, ctx);

    container.registerInstance(Logger, createMockLogger());

    const git: Git.Interface = {
        isClean: vi.fn().mockResolvedValue(true),
        restore: vi.fn().mockResolvedValue(undefined)
    };
    container.registerInstance(Git, git);

    const yarn: PackageManagerService.Interface = {
        install: vi.fn().mockResolvedValue(undefined),
        version: vi.fn(),
        name: vi.fn().mockReturnValue("yarn")
    };
    container.registerInstance(PackageManagerService, yarn);

    const upWebiny: UpWebiny.Interface = {
        execute: vi.fn().mockResolvedValue(undefined)
    };
    container.registerInstance(UpWebiny, upWebiny);
    container.registerInstance(Input, {
        dryRun: false
    } as Input.Interface);

    const upgradeHistory: UpgradeHistory.Interface = {
        add: vi.fn(),
        remove: vi.fn(),
        get: vi.fn(),
        list: vi.fn()
    };
    container.registerInstance(UpgradeHistory, upgradeHistory);

    container.registerInstance(UpgradesDirectory, upgradesDir);

    container.register(UpgradeHandler);
    container.register(UpgradeRunner);

    return { container, ctx, git, yarn, upWebiny };
};
