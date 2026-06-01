import { describe, it, expect, vi } from "vitest";
import { Container } from "@webiny/di";
import { Application as ApplicationToken } from "./abstraction.js";
import { Application } from "./Application.js";
import { UpgradeRunner } from "../../service/UpgradeRunner/abstraction.js";
import { Responder } from "../Responder/abstraction.js";
import { Logger } from "../Logger/abstraction.js";
import { Context } from "../Context/abstraction.js";
import { DependencyGuard } from "../../tool/DependencyGuard/abstraction.js";
import { YarnrcGuard } from "../../tool/YarnrcGuard/abstraction.js";
import { Input } from "../Input/abstraction.js";
import { Version } from "../Version/index.js";
import { createMockLogger } from "../../__tests__/utils/mockLogger.js";
import { YarnrcGuardError } from "../../tool/YarnrcGuard/index.js";

const createMockContext = (installed = "6.0.0", target = "6.1.0"): Context.Interface => ({
    cwd: "/project",
    registry: "https://registry.npmjs.org",
    inputVersion: target,
    targetVersion: Version.create(target),
    installedVersion: Version.create(installed),
    currentVersion: Version.create(installed),
    setCurrentVersion: vi.fn(),
    resolve: vi.fn()
});

const createContainer = (ctx: Context.Interface = createMockContext()) => {
    const container = new Container();

    const logger = createMockLogger();
    container.registerInstance(Logger, logger);

    const dependencyGuard: DependencyGuard.Interface = {
        execute: vi.fn().mockReturnValue([])
    };
    container.registerInstance(DependencyGuard, dependencyGuard);

    const yarnrcGuard: YarnrcGuard.Interface = {
        execute: vi.fn()
    };
    container.registerInstance(YarnrcGuard, yarnrcGuard);

    const runner: UpgradeRunner.Interface = {
        run: vi.fn().mockResolvedValue(undefined)
    };
    container.registerInstance(UpgradeRunner, runner);

    const responder: Responder.Interface = {
        success: vi.fn() as never,
        error: vi.fn() as never
    };
    container.registerInstance(Responder, responder);

    container.registerInstance(Context, ctx);
    container.registerInstance(Input, {
        forceUpgrade: false
    } as Input.Interface);

    container.register(Application);

    return { container, logger, dependencyGuard, yarnrcGuard, runner, responder };
};

describe("Application.execute", () => {
    it("calls responder.success after a successful run", async () => {
        const { container, responder } = createContainer();
        const app = container.resolve(ApplicationToken);

        await app.execute();

        expect(responder.success).toHaveBeenCalledOnce();
        const [duration] = vi.mocked(responder.success).mock.calls[0];
        expect(duration).toBeGreaterThanOrEqual(0);
    });

    it("calls responder.success immediately when target equals installed", async () => {
        const ctx = createMockContext("6.1.0", "6.1.0");
        const { container, responder, runner } = createContainer(ctx);
        const app = container.resolve(ApplicationToken);

        await app.execute();

        expect(responder.success).toHaveBeenCalledOnce();
        const [, message] = vi.mocked(responder.success).mock.calls[0];
        expect(message).toContain("already installed");
        expect(runner.run).not.toHaveBeenCalled();
    });

    it("skips early return when forceUpgrade is true and versions match", async () => {
        const ctx = createMockContext("6.1.0", "6.1.0");
        const { container, runner, responder } = createContainer(ctx);
        const input = container.resolve(Input);
        (input as any).forceUpgrade = true;
        const app = container.resolve(ApplicationToken);

        await app.execute();

        expect(runner.run).toHaveBeenCalledOnce();
        expect(responder.success).toHaveBeenCalledOnce();
    });

    it("calls responder.error when runner throws", async () => {
        const { container, runner, responder } = createContainer();
        vi.mocked(runner.run).mockRejectedValue(new Error("upgrade failed"));
        const app = container.resolve(ApplicationToken);

        await app.execute();

        expect(responder.error).toHaveBeenCalledOnce();
        const [message] = vi.mocked(responder.error).mock.calls[0];
        expect(message).toBe("upgrade failed");
    });

    it("passes the error object to responder.error", async () => {
        const { container, runner, responder } = createContainer();
        const err = new Error("boom");
        vi.mocked(runner.run).mockRejectedValue(err);
        const app = container.resolve(ApplicationToken);

        await app.execute();

        const [, , errorArg] = vi.mocked(responder.error).mock.calls[0];
        expect(errorArg).toBe(err);
    });

    it("logs warnings and continues when dependency guard detects mismatches", async () => {
        const { container, dependencyGuard, responder } = createContainer();
        vi.mocked(dependencyGuard.execute).mockReturnValue([
            { name: "@webiny/app", userVersion: "6.0.0", expectedVersion: "6.1.0" }
        ]);
        const app = container.resolve(ApplicationToken);

        await app.execute();

        expect(responder.success).toHaveBeenCalledOnce();
    });

    it("logs each mismatch as a warning", async () => {
        const { container, dependencyGuard, logger } = createContainer();
        vi.mocked(dependencyGuard.execute).mockReturnValue([
            { name: "@webiny/app", userVersion: "6.0.0", expectedVersion: "6.1.0" }
        ]);
        const app = container.resolve(ApplicationToken);

        await app.execute();

        const warningCalls = vi.mocked(logger.warn).mock.calls.map(c => c[0]);
        expect(warningCalls.some(msg => msg.includes("@webiny/app"))).toBe(true);
    });

    it("calls yarnrcGuard.execute before runner.run", async () => {
        const callOrder: string[] = [];
        const { container, yarnrcGuard, runner } = createContainer();
        vi.mocked(yarnrcGuard.execute).mockImplementation(() => {
            callOrder.push("yarnrcGuard");
        });
        vi.mocked(runner.run).mockImplementation(async () => {
            callOrder.push("runner");
        });
        const app = container.resolve(ApplicationToken);

        await app.execute();

        expect(callOrder).toEqual(["yarnrcGuard", "runner"]);
    });

    it("calls responder.error when yarnrcGuard throws", async () => {
        const { container, yarnrcGuard, runner, responder } = createContainer();
        vi.mocked(yarnrcGuard.execute).mockImplementation(() => {
            throw new YarnrcGuardError(["enableScripts"]);
        });
        const app = container.resolve(ApplicationToken);

        await app.execute();

        expect(runner.run).not.toHaveBeenCalled();
        expect(responder.error).toHaveBeenCalledOnce();
        const [message] = vi.mocked(responder.error).mock.calls[0];
        expect(message).toContain("enableScripts");
    });

    it("does not call yarnrcGuard when target equals installed and forceUpgrade is false", async () => {
        const ctx = createMockContext("6.1.0", "6.1.0");
        const { container, yarnrcGuard } = createContainer(ctx);
        const app = container.resolve(ApplicationToken);

        await app.execute();

        expect(yarnrcGuard.execute).not.toHaveBeenCalled();
    });
});
