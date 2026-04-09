import { describe, it, expect, vi, beforeEach } from "vitest";
import { Container } from "@webiny/di";
import { RegistryService as RegistryServiceImpl } from "./RegistryService.js";
import { RegistryService } from "./abstraction.js";
import { Input } from "../../base/Input/abstraction.js";
import { Logger } from "../../base/Logger/abstraction.js";
import { createMockLogger } from "../../__tests__/utils/mockLogger.js";

const createContainer = (registry = "https://registry.npmjs.org") => {
    const container = new Container();
    container.registerInstance(Input, {
        cwd: "/project",
        registry,
        version: "6.0.0",
        logLevel: "error",
        json: false,
        forceUpgrade: false,
        skipDependencyGuard: true,
        dryRun: false
    });
    container.registerInstance(Logger, createMockLogger());
    container.register(RegistryServiceImpl);
    return container;
};

const mockFetch = (data: unknown, ok = true) => {
    vi.spyOn(global, "fetch").mockResolvedValue({
        ok,
        status: ok ? 200 : 404,
        json: async () => data
    } as Response);
};

describe("RegistryService", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe("getLatestVersion", () => {
        it("returns the parsed latest version", async () => {
            mockFetch({ "dist-tags": { latest: "6.1.0" }, versions: {} });
            const service = createContainer().resolve(RegistryService);
            const result = await service.getLatestVersion("@webiny/cli");
            expect(result?.format()).toBe("6.1.0");
        });

        it("fetches from the correct registry URL", async () => {
            const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
                ok: true,
                json: async () => ({ "dist-tags": { latest: "6.0.0" }, versions: {} })
            } as Response);
            const service = createContainer("https://my.registry.com").resolve(RegistryService);
            await service.getLatestVersion("@webiny/cli");
            expect(fetchSpy).toHaveBeenCalledWith("https://my.registry.com/@webiny/cli");
        });

        it("returns null and logs warning when registry responds with non-ok status", async () => {
            mockFetch({}, false);
            const container = createContainer();
            const logger = container.resolve(Logger);
            const service = container.resolve(RegistryService);
            const result = await service.getLatestVersion("@webiny/cli");
            expect(result).toBeNull();
            expect(logger.warn).toHaveBeenCalled();
        });

        it("returns null and logs warning when dist-tags.latest is missing", async () => {
            mockFetch({ "dist-tags": {}, versions: {} });
            const container = createContainer();
            const logger = container.resolve(Logger);
            const service = container.resolve(RegistryService);
            const result = await service.getLatestVersion("@webiny/cli");
            expect(result).toBeNull();
            expect(logger.warn).toHaveBeenCalled();
        });

        it("returns null and logs warning when latest version string is not valid semver", async () => {
            mockFetch({ "dist-tags": { latest: "not-a-version" }, versions: {} });
            const container = createContainer();
            const logger = container.resolve(Logger);
            const service = container.resolve(RegistryService);
            const result = await service.getLatestVersion("@webiny/cli");
            expect(result).toBeNull();
            expect(logger.warn).toHaveBeenCalled();
        });

        it("returns null and logs error when fetch throws", async () => {
            vi.spyOn(global, "fetch").mockRejectedValue(new Error("network error"));
            const container = createContainer();
            const logger = container.resolve(Logger);
            const service = container.resolve(RegistryService);
            const result = await service.getLatestVersion("@webiny/cli");
            expect(result).toBeNull();
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe("getVersion", () => {
        it("returns the parsed version when it exists in the registry", async () => {
            mockFetch({ "dist-tags": {}, versions: { "6.0.0": {} } });
            const service = createContainer().resolve(RegistryService);
            const result = await service.getVersion("@webiny/cli", "6.0.0");
            expect(result?.format()).toBe("6.0.0");
        });

        it("accepts a Version object as version", async () => {
            const { Version } = await import("../../base/Version/index.js");
            mockFetch({ "dist-tags": {}, versions: { "6.0.0": {} } });
            const service = createContainer().resolve(RegistryService);
            const result = await service.getVersion("@webiny/cli", Version.create("6.0.0"));
            expect(result?.format()).toBe("6.0.0");
        });

        it("returns null and logs warning when version string is not valid semver", async () => {
            mockFetch({ "dist-tags": {}, versions: { "not-semver": {} } });
            const container = createContainer();
            const logger = container.resolve(Logger);
            const service = container.resolve(RegistryService);
            const result = await service.getVersion("@webiny/cli", "not-semver");
            expect(result).toBeNull();
            expect(logger.warn).toHaveBeenCalled();
        });

        it("returns null when the version does not exist in registry", async () => {
            mockFetch({ "dist-tags": {}, versions: {} });
            const service = createContainer().resolve(RegistryService);
            const result = await service.getVersion("@webiny/cli", "6.0.0");
            expect(result).toBeNull();
        });

        it("returns null when fetch fails", async () => {
            vi.spyOn(global, "fetch").mockRejectedValue(new Error("network error"));
            const service = createContainer().resolve(RegistryService);
            const result = await service.getVersion("@webiny/cli", "6.0.0");
            expect(result).toBeNull();
        });

        it("returns null when registry returns non-ok status", async () => {
            mockFetch({}, false);
            const service = createContainer().resolve(RegistryService);
            const result = await service.getVersion("@webiny/cli", "6.0.0");
            expect(result).toBeNull();
        });
    });
});
