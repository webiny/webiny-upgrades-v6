import { describe, it, expect, vi } from "vitest";
import { Container } from "@webiny/di";
import { PackageManagerService } from "./PackageManagerService.js";
import { PackageManagerService as PackageManagerServiceToken, PackageManager } from "./abstraction.js";
import { Timer } from "../../base/Timer/abstraction.js";
import { Logger } from "../../base/Logger/abstraction.js";
import { Version } from "../../base/Version/index.js";
import { createMockLogger } from "../../__tests__/utils/mockLogger.js";

const createContainer = () => {
    const container = new Container();

    const packageManager: PackageManager.Interface = {
        install: vi.fn().mockResolvedValue(undefined),
        version: vi.fn().mockResolvedValue(Version.create("4.1.0"))
    };
    container.registerInstance(PackageManager, packageManager);

    const timer: Timer.Interface = {
        execute: vi.fn().mockImplementation(async (_name: string, cb: () => Promise<unknown>) => {
            const result = await cb();
            return { result, startAt: new Date(), endAt: new Date(), duration: 0 };
        })
    };
    container.registerInstance(Timer, timer);

    const logger = createMockLogger();
    container.registerInstance(Logger, logger);

    container.register(PackageManagerService);

    return { container, packageManager, timer, logger };
};

describe("PackageManagerService", () => {
    describe("install", () => {
        it("calls packageManager.install", async () => {
            const { container, packageManager } = createContainer();
            const service = container.resolve(PackageManagerServiceToken);

            await service.install();

            expect(packageManager.install).toHaveBeenCalledOnce();
        });

        it("logs before installing", async () => {
            const { container, logger } = createContainer();
            const service = container.resolve(PackageManagerServiceToken);

            await service.install();

            expect(logger.info).toHaveBeenCalledWith("Installing packages...");
        });

        it("wraps install in a timer", async () => {
            const { container, timer } = createContainer();
            const service = container.resolve(PackageManagerServiceToken);

            await service.install();

            expect(timer.execute).toHaveBeenCalledWith(
                "PackageManagerService.install",
                expect.any(Function)
            );
        });
    });

    describe("version", () => {
        it("returns the version from the package manager", async () => {
            const { container } = createContainer();
            const service = container.resolve(PackageManagerServiceToken);

            const result = await service.version();

            expect(result.format()).toBe("4.1.0");
        });

        it("delegates to packageManager.version", async () => {
            const { container, packageManager } = createContainer();
            const service = container.resolve(PackageManagerServiceToken);

            await service.version();

            expect(packageManager.version).toHaveBeenCalledOnce();
        });
    });
});
