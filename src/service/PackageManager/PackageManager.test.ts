import { describe, it, expect, vi, beforeEach } from "vitest";
import { Container } from "@webiny/di";
import { PackageManager } from "./abstraction.js";
import { YarnPackageManager } from "./YarnPackageManager.js";
import { PnpmPackageManager } from "./PnpmPackageManager.js";
import { NpmPackageManager } from "./NpmPackageManager.js";
import { detectPackageManager } from "./detect.js";
import { PackageManagerDetectionError } from "./PackageManagerDetectionError.js";
import { InvalidSemverError } from "../../base/Version/index.js";
import { Logger } from "../../base/Logger/abstraction.js";
import { createMockLogger } from "../../__tests__/utils/mockLogger.js";

vi.mock("execa", () => ({ execa: vi.fn() }));
vi.mock("node:fs");

import { execa } from "execa";
import fs from "node:fs";

const createContainer = (Implementation: any) => {
    const container = new Container();
    container.registerInstance(Logger, createMockLogger());
    container.register(Implementation);
    return container;
};

describe("detectPackageManager", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns yarn when yarn.lock exists", () => {
        (fs.existsSync as any).mockImplementation((p: string) => p.endsWith("yarn.lock"));
        expect(detectPackageManager("/project")).toBe("yarn");
    });

    it("returns pnpm when pnpm-lock.yaml exists", () => {
        (fs.existsSync as any).mockImplementation((p: string) => p.endsWith("pnpm-lock.yaml"));
        expect(detectPackageManager("/project")).toBe("pnpm");
    });

    it("returns npm when package-lock.json exists", () => {
        (fs.existsSync as any).mockImplementation((p: string) => p.endsWith("package-lock.json"));
        expect(detectPackageManager("/project")).toBe("npm");
    });

    it("prefers yarn.lock over pnpm-lock.yaml", () => {
        (fs.existsSync as any).mockReturnValue(true);
        expect(detectPackageManager("/project")).toBe("yarn");
    });

    it("returns forced value when provided", () => {
        (fs.existsSync as any).mockReturnValue(false);
        expect(detectPackageManager("/project", "pnpm")).toBe("pnpm");
    });

    it("throws when no lock file is found and no forced value", () => {
        (fs.existsSync as any).mockReturnValue(false);
        expect(() => detectPackageManager("/project")).toThrow(PackageManagerDetectionError);
    });
});

describe("YarnPackageManager", () => {
    beforeEach(() => vi.clearAllMocks());

    it("install runs yarn with no args", async () => {
        (execa as any).mockResolvedValue({});
        await createContainer(YarnPackageManager).resolve(PackageManager).install();
        expect(execa).toHaveBeenCalledWith("yarn", [], { stdio: "inherit" });
    });

    it("install logs message and rethrows on failure", async () => {
        (execa as any).mockRejectedValue({ message: "command failed" });
        const container = createContainer(YarnPackageManager);
        const logger = container.resolve(Logger);
        const pm = container.resolve(PackageManager);

        await expect(pm.install()).rejects.toEqual({ message: "command failed" });
        expect(logger.error).toHaveBeenCalledWith("command failed");
    });

    it("version runs yarn --version and parses result", async () => {
        (execa as any).mockResolvedValue({ stdout: "4.1.0" });
        const result = await createContainer(YarnPackageManager).resolve(PackageManager).version();
        expect(result.format()).toBe("4.1.0");
    });

    it("version throws when output is not valid semver", async () => {
        (execa as any).mockResolvedValue({ stdout: "not-a-version" });
        const pm = createContainer(YarnPackageManager).resolve(PackageManager);
        await expect(pm.version()).rejects.toThrow(InvalidSemverError);
    });

    it("update runs yarn set version with the given version", async () => {
        (execa as any).mockResolvedValue({});
        await createContainer(YarnPackageManager).resolve(PackageManager).update("4.14.1");
        expect(execa).toHaveBeenCalledWith("yarn", ["set", "version", "4.14.1"], {
            stdio: "inherit"
        });
    });

    it("update logs message and rethrows on failure", async () => {
        (execa as any).mockRejectedValue({ message: "command failed" });
        const container = createContainer(YarnPackageManager);
        const logger = container.resolve(Logger);
        const pm = container.resolve(PackageManager);

        await expect(pm.update("4.14.1")).rejects.toEqual({ message: "command failed" });
        expect(logger.error).toHaveBeenCalledWith("command failed");
    });
});

describe("PnpmPackageManager", () => {
    beforeEach(() => vi.clearAllMocks());

    it("install runs pnpm install", async () => {
        (execa as any).mockResolvedValue({});
        await createContainer(PnpmPackageManager).resolve(PackageManager).install();
        expect(execa).toHaveBeenCalledWith("pnpm", ["install"], { stdio: "inherit" });
    });

    it("install logs message and rethrows on failure", async () => {
        (execa as any).mockRejectedValue({ message: "pnpm failed" });
        const container = createContainer(PnpmPackageManager);
        const logger = container.resolve(Logger);
        const pm = container.resolve(PackageManager);

        await expect(pm.install()).rejects.toEqual({ message: "pnpm failed" });
        expect(logger.error).toHaveBeenCalledWith("pnpm failed");
    });

    it("version runs pnpm --version and parses result", async () => {
        (execa as any).mockResolvedValue({ stdout: "9.0.0" });
        const result = await createContainer(PnpmPackageManager).resolve(PackageManager).version();
        expect(result.format()).toBe("9.0.0");
    });

    it("version throws when output is not valid semver", async () => {
        (execa as any).mockResolvedValue({ stdout: "bad" });
        const pm = createContainer(PnpmPackageManager).resolve(PackageManager);
        await expect(pm.version()).rejects.toThrow(InvalidSemverError);
    });

    it("update throws not supported error", async () => {
        const pm = createContainer(PnpmPackageManager).resolve(PackageManager);
        await expect(pm.update("9.0.0")).rejects.toThrow(
            "Updating pnpm via PackageManagerService is not supported yet."
        );
    });
});

describe("NpmPackageManager", () => {
    beforeEach(() => vi.clearAllMocks());

    it("install runs npm install", async () => {
        (execa as any).mockResolvedValue({});
        await createContainer(NpmPackageManager).resolve(PackageManager).install();
        expect(execa).toHaveBeenCalledWith("npm", ["install"], { stdio: "inherit" });
    });

    it("install logs message and rethrows on failure", async () => {
        (execa as any).mockRejectedValue({ message: "npm failed" });
        const container = createContainer(NpmPackageManager);
        const logger = container.resolve(Logger);
        const pm = container.resolve(PackageManager);

        await expect(pm.install()).rejects.toEqual({ message: "npm failed" });
        expect(logger.error).toHaveBeenCalledWith("npm failed");
    });

    it("version runs npm --version and parses result", async () => {
        (execa as any).mockResolvedValue({ stdout: "10.2.0" });
        const result = await createContainer(NpmPackageManager).resolve(PackageManager).version();
        expect(result.format()).toBe("10.2.0");
    });

    it("version throws when output is not valid semver", async () => {
        (execa as any).mockResolvedValue({ stdout: "bad" });
        const pm = createContainer(NpmPackageManager).resolve(PackageManager);
        await expect(pm.version()).rejects.toThrow(InvalidSemverError);
    });

    it("update runs npm install -g with the given version", async () => {
        (execa as any).mockResolvedValue({});
        await createContainer(NpmPackageManager).resolve(PackageManager).update("10.2.0");
        expect(execa).toHaveBeenCalledWith("npm", ["install", "-g", "npm@10.2.0"], {
            stdio: "inherit"
        });
    });

    it("update logs message and rethrows on failure", async () => {
        (execa as any).mockRejectedValue({ message: "npm failed" });
        const container = createContainer(NpmPackageManager);
        const logger = container.resolve(Logger);
        const pm = container.resolve(PackageManager);

        await expect(pm.update("10.2.0")).rejects.toEqual({ message: "npm failed" });
        expect(logger.error).toHaveBeenCalledWith("npm failed");
    });
});
