import { describe, it, expect, vi } from "vitest";
import { Container } from "@webiny/di";
import { PackageJsonTool as PackageJsonToolImpl } from "./PackageJsonTool.js";
import { PackageJsonTool } from "./abstraction.js";
import { Context } from "../../base/Context/abstraction.js";
import { PackageJsonService } from "../../service/PackageJson/abstraction.js";
import { createMockPackageJsonFile } from "../../__tests__/utils/mockPackageJsonFile.js";

const createContainer = (resolvedPath = "/project/package.json") => {
    const container = new Container();
    container.registerInstance(Context, {
        cwd: "/project",
        resolve: vi.fn().mockReturnValue(resolvedPath)
    } as unknown as Context.Interface);
    container.registerInstance(PackageJsonService, {
        load: vi.fn().mockReturnValue(null),
        loadOrThrow: vi.fn().mockImplementation(() => {
            throw new Error("Failed to load package.json");
        }),
        save: vi.fn()
    });
    container.register(PackageJsonToolImpl);
    return container;
};

describe("PackageJsonTool", () => {
    describe("load", () => {
        it("resolves path via context when no target is provided", () => {
            const container = createContainer("/project/package.json");
            const context = container.resolve(Context);
            const tool = container.resolve(PackageJsonTool);

            tool.load();

            expect(context.resolve).toHaveBeenCalledWith("package.json");
        });

        it("passes the resolved path to the service when no target is provided", () => {
            const container = createContainer("/project/package.json");
            const service = container.resolve(PackageJsonService);
            const tool = container.resolve(PackageJsonTool);

            tool.load();

            expect(service.load).toHaveBeenCalledWith("/project/package.json");
        });

        it("skips context.resolve and uses the provided target path directly", () => {
            const container = createContainer();
            const context = container.resolve(Context);
            const service = container.resolve(PackageJsonService);
            const tool = container.resolve(PackageJsonTool);

            tool.load("/other/package.json");

            expect(context.resolve).not.toHaveBeenCalled();
            expect(service.load).toHaveBeenCalledWith("/other/package.json");
        });

        it("returns the file from the service", () => {
            const file = createMockPackageJsonFile();
            const container = createContainer();
            const service = container.resolve(PackageJsonService);
            (service.load as any).mockReturnValue(file);
            const tool = container.resolve(PackageJsonTool);

            expect(tool.load()).toBe(file);
        });

        it("returns null when the service returns null", () => {
            const container = createContainer();
            const tool = container.resolve(PackageJsonTool);

            expect(tool.load()).toBeNull();
        });
    });

    describe("loadOrThrow", () => {
        it("resolves path via context when no target is provided", () => {
            const container = createContainer("/project/package.json");
            const context = container.resolve(Context);
            const service = container.resolve(PackageJsonService);
            (service.loadOrThrow as any).mockReturnValue(createMockPackageJsonFile());
            const tool = container.resolve(PackageJsonTool);

            tool.loadOrThrow();

            expect(context.resolve).toHaveBeenCalledWith("package.json");
        });

        it("returns the file from the service", () => {
            const file = createMockPackageJsonFile();
            const container = createContainer();
            const service = container.resolve(PackageJsonService);
            (service.loadOrThrow as any).mockReturnValue(file);
            const tool = container.resolve(PackageJsonTool);

            expect(tool.loadOrThrow()).toBe(file);
        });

        it("throws when the service throws", () => {
            const container = createContainer();
            const tool = container.resolve(PackageJsonTool);

            expect(() => tool.loadOrThrow()).toThrow("Failed to load package.json");
        });

        it("passes the provided target path directly to the service", () => {
            const file = createMockPackageJsonFile();
            const container = createContainer();
            const context = container.resolve(Context);
            const service = container.resolve(PackageJsonService);
            (service.loadOrThrow as any).mockReturnValue(file);
            const tool = container.resolve(PackageJsonTool);

            tool.loadOrThrow("/other/package.json");

            expect(context.resolve).not.toHaveBeenCalled();
            expect(service.loadOrThrow).toHaveBeenCalledWith("/other/package.json");
        });
    });

    describe("save", () => {
        it("delegates to the service", () => {
            const file = createMockPackageJsonFile();
            const container = createContainer();
            const service = container.resolve(PackageJsonService);
            const tool = container.resolve(PackageJsonTool);

            tool.save(file);

            expect(service.save).toHaveBeenCalledWith(file);
        });
    });
});
