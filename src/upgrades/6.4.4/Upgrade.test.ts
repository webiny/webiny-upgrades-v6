import { beforeEach, describe, expect, it, vi } from "vitest";
import { Container } from "@webiny/di";
import { Upgrade as Upgrade644 } from "./Upgrade.js";
import { Upgrade } from "../../base/Upgrade/abstraction.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";
import { PackageJsonLoadError } from "../../service/PackageJson/index.js";
import { createMockPackageJsonFile } from "../../__tests__/utils/mockPackageJsonFile.js";
import { registerUpgradeDeps } from "../../__tests__/utils/mockUpgradeDeps.js";
import { Version } from "../../base/Version/index.js";
import type { PackageJsonFile } from "../../service/PackageJson/abstraction.js";

const v = (version: string) => Version.create(version);

const params = (target: string, current: string) => ({
    targetVersion: v(target),
    currentVersion: v(current)
});

const createContainer = (file: PackageJsonFile.Interface | null = createMockPackageJsonFile()) => {
    const container = new Container();
    registerUpgradeDeps(container, file);
    container.register(Upgrade644);
    return container;
};

describe("Upgrade 6.4.4 - canHandle", () => {
    let upgrade: Upgrade.Interface;

    beforeEach(() => {
        vi.clearAllMocks();
        upgrade = createContainer().resolve(Upgrade);
    });

    it("returns true when current is below 6.4.4 and target is 6.4.4", async () => {
        expect(await upgrade.canHandle(params("6.4.4", "6.4.3"))).toBe(true);
    });

    it("returns true when target is above 6.4.4 and current is below 6.4.4", async () => {
        expect(await upgrade.canHandle(params("6.5.0", "6.4.0"))).toBe(true);
    });

    it("returns false when current is already at 6.4.4", async () => {
        expect(await upgrade.canHandle(params("6.4.4", "6.4.4"))).toBe(false);
    });

    it("returns false when current is above 6.4.4", async () => {
        expect(await upgrade.canHandle(params("6.5.0", "6.4.4"))).toBe(false);
    });

    it("returns false when target is below 6.4.4", async () => {
        expect(await upgrade.canHandle(params("6.4.3", "6.4.0"))).toBe(false);
    });

    it("returns true when target is a pre-release of 6.4.4 and current is below 6.4.4", async () => {
        expect(await upgrade.canHandle(params("6.4.4-beta.0", "6.4.3"))).toBe(true);
        expect(await upgrade.canHandle(params("6.4.4-unstable.0", "6.4.0"))).toBe(true);
        expect(await upgrade.canHandle(params("6.4.4-alpha.1", "6.4.0"))).toBe(true);
    });

    it("returns true when current is a pre-release of 6.4.4 and target is above 6.4.4", async () => {
        expect(await upgrade.canHandle(params("6.5.0", "6.4.4-beta.0"))).toBe(true);
        expect(await upgrade.canHandle(params("6.5.0", "6.4.4-local-npm.11"))).toBe(true);
    });

    it("returns true when current and target are both pre-releases of 6.4.4", async () => {
        expect(await upgrade.canHandle(params("6.4.4-beta.3", "6.4.4-beta.0"))).toBe(true);
        expect(await upgrade.canHandle(params("6.4.4-beta.3", "6.4.4-beta.1"))).toBe(true);
        expect(await upgrade.canHandle(params("6.4.4-beta.3", "6.4.4-local-npm.11"))).toBe(true);
    });

    it("returns true when current is a pre-release of 6.4.4 and target is 6.4.4", async () => {
        expect(await upgrade.canHandle(params("6.4.4", "6.4.4-beta.0"))).toBe(true);
        expect(await upgrade.canHandle(params("6.4.4", "6.4.4-beta.1"))).toBe(true);
        expect(await upgrade.canHandle(params("6.4.4", "6.4.4-local-npm.11"))).toBe(true);
    });
});

describe("Upgrade 6.4.4 - execute", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("sets @types/react devDependency to 18.3.31", async () => {
        const file = createMockPackageJsonFile();
        const upgrade = createContainer(file).resolve(Upgrade);
        await upgrade.execute();
        expect(file.getDevDependency("@types/react")).toBe("18.3.31");
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
});
