import { describe, expect, it, vi } from "vitest";
import { Container } from "@webiny/di";
import { UpgradeHandler } from "./UpgradeHandler.js";
import { UpgradeHandler as UpgradeHandlerToken } from "./abstraction.js";
import type { Upgrade as UpgradeNS } from "../../base/Upgrade/abstraction.js";
import { Upgrade } from "../../base/Upgrade/abstraction.js";
import { Context } from "../../base/Context/abstraction.js";
import { Logger } from "../../base/Logger/abstraction.js";
import { Git } from "../Git/abstraction.js";
import { PackageManagerService } from "../PackageManager/abstraction.js";
import { UpWebiny } from "../../tool/UpWebiny/abstraction.js";
import { Input } from "../../base/Input/abstraction.js";
import { UpgradeHistory } from "../../tool/UpgradeHistory/abstraction.js";
import { Version } from "../../base/Version/index.js";
import { createMockLogger } from "../../__tests__/utils/mockLogger.js";

const v = (version: string) => Version.create(version);

const createMockUpgrade = (ver: string, canHandleResult = true) => {
    const canHandle = vi.fn().mockResolvedValue(canHandleResult);
    const execute = vi.fn().mockResolvedValue(undefined);

    const Registration = Upgrade.createImplementation({
        implementation: class implements UpgradeNS.Interface {
            readonly version = v(ver);
            canHandle = canHandle;
            execute = execute;
        },
        dependencies: []
    });

    return { Registration, canHandle, execute };
};

const createMockContext = (current: string, target: string): Context.Interface => {
    const ctx: Context.Interface = {
        cwd: "/project",
        registry: "https://registry.npmjs.org",
        inputVersion: target,
        targetVersion: v(target),
        installedVersion: v(current),
        currentVersion: v(current),
        setCurrentVersion: vi.fn((ver: Version) => {
            ctx.currentVersion = ver;
        }),
        resolve: vi.fn()
    };
    return ctx;
};

const createMockGit = (isCleanResult = true): Git.Interface => ({
    isClean: vi.fn().mockResolvedValue(isCleanResult),
    restore: vi.fn().mockResolvedValue(undefined)
});

const createMockUpWebiny = (): UpWebiny.Interface => ({
    execute: vi.fn().mockResolvedValue(undefined)
});

const createContainer = (
    upgrades: ReturnType<typeof createMockUpgrade>[],
    ctx: Context.Interface,
    git: Git.Interface = createMockGit()
) => {
    const container = new Container();

    for (const { Registration } of upgrades) {
        container.register(Registration);
    }

    container.registerInstance(Context, ctx);
    container.registerInstance(Logger, createMockLogger());
    container.registerInstance(Git, git);
    container.registerInstance(PackageManagerService, {
        install: vi.fn().mockResolvedValue(undefined),
        version: vi.fn()
    });
    container.registerInstance(UpWebiny, createMockUpWebiny());
    container.registerInstance(Input, {
        dryRun: false
    } as Input.Interface);
    container.registerInstance(UpgradeHistory, {
        add: vi.fn(),
        remove: vi.fn(),
        get: vi.fn(),
        list: vi.fn()
    });

    container.register(UpgradeHandler);

    return container;
};

describe("UpgradeHandler", () => {
    describe("git clean check", () => {
        it("throws when git repo is dirty", async () => {
            const ctx = createMockContext("6.0.0", "6.1.0");
            const git = createMockGit(false);
            const upgrade = createMockUpgrade("6.1.0");
            const handler = createContainer([upgrade], ctx, git).resolve(UpgradeHandlerToken);

            await expect(handler.handle({ version: v("6.1.0") })).rejects.toThrow(
                "Git repository has uncommitted changes"
            );
            expect(upgrade.execute).not.toHaveBeenCalled();
        });
    });

    describe("pool building", () => {
        it("excludes upgrades where canHandle returns false", async () => {
            const upgrade = createMockUpgrade("6.1.0", false);
            const ctx = createMockContext("6.0.0", "6.1.0");
            const container = createContainer([upgrade], ctx);
            const handler = container.resolve(UpgradeHandlerToken);

            await handler.handle({ version: v("6.1.0") });

            expect(upgrade.execute).not.toHaveBeenCalled();
        });

        it("skips upgrades already in history", async () => {
            const upgrade = createMockUpgrade("6.1.0");
            const ctx = createMockContext("6.0.0", "6.1.0");
            const container = createContainer([upgrade], ctx);
            const history = container.resolve(UpgradeHistory);
            vi.mocked(history.get).mockReturnValue({
                version: "6.1.0",
                timestamp: "2026-03-31T10:00:00.000Z"
            });
            const handler = container.resolve(UpgradeHandlerToken);

            await handler.handle({ version: v("6.1.0") });

            expect(upgrade.execute).not.toHaveBeenCalled();
        });

        it("force runs upgrades >= current and <= target, skipping history", async () => {
            const upgrade600 = createMockUpgrade("6.0.0");
            const upgrade610 = createMockUpgrade("6.1.0");
            const upgrade620 = createMockUpgrade("6.2.0");
            const ctx = createMockContext("6.1.0", "6.2.0");
            const container = createContainer([upgrade600, upgrade610, upgrade620], ctx);
            const input = container.resolve(Input);
            (input as any).forceUpgrade = true;
            const history = container.resolve(UpgradeHistory);
            vi.mocked(history.get).mockReturnValue({
                version: "6.1.0",
                timestamp: "2026-03-31T10:00:00.000Z"
            });
            const handler = container.resolve(UpgradeHandlerToken);

            await handler.handle({ version: v("6.2.0") });

            expect(upgrade600.execute).not.toHaveBeenCalled();
            expect(upgrade610.execute).toHaveBeenCalledOnce();
            expect(upgrade620.execute).toHaveBeenCalledOnce();
        });

        it("force does not duplicate history entry if already present", async () => {
            const upgrade = createMockUpgrade("6.1.0");
            const ctx = createMockContext("6.1.0", "6.1.0");
            const container = createContainer([upgrade], ctx);
            const input = container.resolve(Input);
            (input as any).forceUpgrade = true;
            const history = container.resolve(UpgradeHistory);
            vi.mocked(history.get).mockReturnValue({
                version: "6.1.0",
                timestamp: "2026-03-31T10:00:00.000Z"
            });
            const handler = container.resolve(UpgradeHandlerToken);

            await handler.handle({ version: v("6.1.0") });

            expect(upgrade.execute).toHaveBeenCalledOnce();
            expect(history.add).not.toHaveBeenCalled();
        });

        it("force does not run upgrades below current version", async () => {
            const upgrade600 = createMockUpgrade("6.0.0");
            const upgrade610 = createMockUpgrade("6.1.0");
            const ctx = createMockContext("6.1.0", "6.1.0");
            const container = createContainer([upgrade600, upgrade610], ctx);
            const input = container.resolve(Input);
            (input as any).forceUpgrade = true;
            const handler = container.resolve(UpgradeHandlerToken);

            await handler.handle({ version: v("6.1.0") });

            expect(upgrade600.execute).not.toHaveBeenCalled();
            expect(upgrade610.execute).toHaveBeenCalledOnce();
        });

        it("runs a fix upgrade (6.1.0-fix.0) even when 6.1.0 is in history", async () => {
            const fixUpgrade = createMockUpgrade("6.1.0-fix.0");
            const ctx = createMockContext("6.0.0", "6.1.0");
            const container = createContainer([fixUpgrade], ctx);
            const history = container.resolve(UpgradeHistory);
            vi.mocked(history.get).mockImplementation(version => {
                if (version.raw === "6.1.0") {
                    return { version: "6.1.0", timestamp: "2026-03-31T10:00:00.000Z" };
                }
                return null;
            });
            const handler = container.resolve(UpgradeHandlerToken);

            await handler.handle({ version: v("6.1.0") });

            expect(fixUpgrade.execute).toHaveBeenCalledOnce();
        });

        it("returns early and logs when pool is empty", async () => {
            const ctx = createMockContext("6.0.0", "6.1.0");
            const container = createContainer([], ctx);
            const logger = container.resolve(Logger);
            const handler = container.resolve(UpgradeHandlerToken);

            await handler.handle({ version: v("6.1.0") });

            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("No upgrades found"));
        });
    });

    describe("execution", () => {
        it("executes all upgrades in pool in order", async () => {
            const order: string[] = [];
            const upgrade1 = createMockUpgrade("6.0.1");
            const upgrade2 = createMockUpgrade("6.1.0");
            upgrade1.execute.mockImplementation(() => {
                order.push("6.0.1");
            });
            upgrade2.execute.mockImplementation(() => {
                order.push("6.1.0");
            });

            const ctx = createMockContext("6.0.0", "6.1.0");
            const handler = createContainer([upgrade1, upgrade2], ctx).resolve(UpgradeHandlerToken);

            await handler.handle({ version: v("6.1.0") });
            expect(order).toEqual(["6.0.1", "6.1.0"]);
        });

        it("advances context.currentVersion after each upgrade", async () => {
            const upgrade1 = createMockUpgrade("6.0.1");
            const upgrade2 = createMockUpgrade("6.1.0");
            const ctx = createMockContext("6.0.0", "6.1.0");
            const handler = createContainer([upgrade1, upgrade2], ctx).resolve(UpgradeHandlerToken);

            await handler.handle({ version: v("6.1.0") });

            expect(ctx.setCurrentVersion).toHaveBeenCalledTimes(2);
            expect(ctx.setCurrentVersion).toHaveBeenNthCalledWith(1, v("6.0.1"));
            expect(ctx.setCurrentVersion).toHaveBeenNthCalledWith(2, v("6.1.0"));
        });

        it("calls git.restore and rethrows when an upgrade step fails", async () => {
            const upgrade1 = createMockUpgrade("6.0.1");
            const upgrade2 = createMockUpgrade("6.1.0");
            upgrade2.execute.mockRejectedValue(new Error("step failed"));

            const ctx = createMockContext("6.0.0", "6.1.0");
            const git = createMockGit();
            const handler = createContainer([upgrade1, upgrade2], ctx, git).resolve(
                UpgradeHandlerToken
            );

            await expect(handler.handle({ version: v("6.1.0") })).rejects.toThrow("step failed");
            expect(git.restore).toHaveBeenCalledOnce();
        });

        it("calls packageManager.install on success", async () => {
            const upgrade = createMockUpgrade("6.1.0");
            const ctx = createMockContext("6.0.0", "6.1.0");
            const container = createContainer([upgrade], ctx);
            const packageManager = container.resolve(PackageManagerService);
            const handler = container.resolve(UpgradeHandlerToken);

            await handler.handle({ version: v("6.1.0") });

            expect(packageManager.install).toHaveBeenCalledOnce();
        });

        it("does not call git.restore on success", async () => {
            const upgrade = createMockUpgrade("6.1.0");
            const ctx = createMockContext("6.0.0", "6.1.0");
            const git = createMockGit();
            const handler = createContainer([upgrade], ctx, git).resolve(UpgradeHandlerToken);

            await handler.handle({ version: v("6.1.0") });

            expect(git.restore).not.toHaveBeenCalled();
        });

        it("pins all @webiny/* packages to the target version before install", async () => {
            const upgrade = createMockUpgrade("6.1.0");
            const ctx = createMockContext("6.0.0", "6.1.0-beta.0");
            const container = createContainer([upgrade], ctx);
            const upWebiny = container.resolve(UpWebiny);
            const handler = container.resolve(UpgradeHandlerToken);

            await handler.handle({ version: v("6.1.0-beta.0") });

            expect(upWebiny.execute).toHaveBeenCalledWith({ version: v("6.1.0-beta.0") });
        });

        it("pins to exact target version even for release targets", async () => {
            const upgrade = createMockUpgrade("6.1.0");
            const ctx = createMockContext("6.0.0", "6.1.0");
            const container = createContainer([upgrade], ctx);
            const upWebiny = container.resolve(UpWebiny);
            const handler = container.resolve(UpgradeHandlerToken);

            await handler.handle({ version: v("6.1.0") });

            expect(upWebiny.execute).toHaveBeenCalledWith({ version: v("6.1.0") });
        });
    });
});
