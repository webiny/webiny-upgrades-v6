import { beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";

vi.mock("node:fs");

import fs from "node:fs";
import { Container } from "@webiny/di";
import { Upgrade as Upgrade630 } from "./Upgrade.js";
import { Upgrade } from "../../base/Upgrade/abstraction.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";
import { PackageManagerService } from "../../service/PackageManager/index.js";
import { PackageJsonLoadError } from "../../service/PackageJson/index.js";
import { createMockPackageJsonFile } from "../../__tests__/utils/mockPackageJsonFile.js";
import { registerUpgradeDeps } from "../../__tests__/utils/mockUpgradeDeps.js";
import { Version } from "../../base/Version/index.js";
import type { PackageJsonFile } from "../../service/PackageJson/abstraction.js";
import type { PackageManagerName } from "../../service/PackageManager/detect.js";

const CWD = "/project";
const BIN_DIR = path.join(
    CWD,
    "node_modules",
    "@webiny",
    "create-webiny-project",
    "services",
    "SetupYarn",
    "binaries"
);

const v = (version: string) => Version.create(version);

const params = (target: string, current: string) => ({
    targetVersion: v(target),
    currentVersion: v(current)
});

const createContainer = (
    file: PackageJsonFile.Interface | null = createMockPackageJsonFile(),
    pmName: PackageManagerName = "yarn"
) => {
    const container = new Container();
    registerUpgradeDeps(container, file);
    container.registerInstance(PackageManagerService, {
        install: vi.fn(),
        version: vi.fn(),
        name: vi.fn().mockReturnValue(pmName)
    });
    container.register(Upgrade630);
    return container;
};

describe("Upgrade 6.3.0 - canHandle", () => {
    let upgrade: Upgrade.Interface;

    beforeEach(() => {
        vi.clearAllMocks();
        upgrade = createContainer().resolve(Upgrade);
    });

    it("returns true when current is below 6.3.0 and target is 6.3.0", async () => {
        expect(await upgrade.canHandle(params("6.3.0", "6.2.0"))).toBe(true);
    });

    it("returns true when target is above 6.3.0 and current is below 6.3.0", async () => {
        expect(await upgrade.canHandle(params("6.4.0", "6.2.0"))).toBe(true);
    });

    it("returns false when current is already at 6.3.0", async () => {
        expect(await upgrade.canHandle(params("6.3.0", "6.3.0"))).toBe(false);
    });

    it("returns false when current is above 6.3.0", async () => {
        expect(await upgrade.canHandle(params("6.4.0", "6.3.0"))).toBe(false);
    });

    it("returns false when target is below 6.3.0", async () => {
        expect(await upgrade.canHandle(params("6.2.0", "6.1.0"))).toBe(false);
    });

    it("returns true when target is a pre-release of 6.3.0 and current is below 6.3.0", async () => {
        expect(await upgrade.canHandle(params("6.3.0-beta.0", "6.2.0"))).toBe(true);
        expect(await upgrade.canHandle(params("6.3.0-unstable.0", "6.2.0"))).toBe(true);
        expect(await upgrade.canHandle(params("6.3.0-alpha.1", "6.2.0"))).toBe(true);
    });

    it("returns true when current is a pre-release of 6.3.0 (raw: release > pre-release)", async () => {
        expect(await upgrade.canHandle(params("6.4.0", "6.3.0-beta.0"))).toBe(true);
        expect(await upgrade.canHandle(params("6.4.0", "6.3.0-local-npm.11"))).toBe(true);
    });
});

describe("Upgrade 6.3.0 - execute", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("sets typescript devDependency to 6.0.3", async () => {
        const file = createMockPackageJsonFile();
        const upgrade = createContainer(file).resolve(Upgrade);

        await upgrade.execute();

        expect(file.getDevDependency("typescript")).toBe("6.0.3");
    });

    it("saves the package.json after setting dependencies", async () => {
        const file = createMockPackageJsonFile();
        const container = createContainer(file);
        const packageJsonTool = container.resolve(PackageJsonTool);
        const upgrade = container.resolve(Upgrade);

        await upgrade.execute();

        expect(packageJsonTool.save).toHaveBeenCalledWith(file);
    });

    it("throws when package.json cannot be loaded", async () => {
        const container = createContainer(null);
        const upgrade = container.resolve(Upgrade);

        await expect(upgrade.execute()).rejects.toThrow(PackageJsonLoadError);
    });

    it("updates packageManager when binary is found in the binaries directory", async () => {
        (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
        (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue(["yarn-4.9.1.cjs"]);

        const file = createMockPackageJsonFile();
        const upgrade = createContainer(file, "yarn").resolve(Upgrade);

        await upgrade.execute();

        expect(file.get("packageManager")).toBe("yarn@4.9.1");
    });

    it("skips packageManager update when project is not yarn", async () => {
        const file = createMockPackageJsonFile();
        const upgrade = createContainer(file, "npm").resolve(Upgrade);

        await upgrade.execute();

        expect(fs.existsSync).not.toHaveBeenCalled();
        expect(file.get("packageManager")).toBe("yarn@4.10.0");
    });

    it("skips packageManager update when binaries directory does not exist", async () => {
        (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);

        const file = createMockPackageJsonFile();
        const upgrade = createContainer(file, "yarn").resolve(Upgrade);

        await upgrade.execute();

        expect(fs.existsSync).toHaveBeenCalledWith(BIN_DIR);
        expect(file.get("packageManager")).toBe("yarn@4.10.0");
    });

    it("skips packageManager update when no yarn binary found in binaries directory", async () => {
        (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
        (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([]);

        const file = createMockPackageJsonFile();
        const upgrade = createContainer(file, "yarn").resolve(Upgrade);

        await upgrade.execute();

        expect(file.get("packageManager")).toBe("yarn@4.10.0");
    });
});
