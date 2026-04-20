import { beforeEach, describe, expect, it } from "vitest";
import { Container } from "@webiny/di";
import { Upgrade as Upgrade620 } from "./Upgrade.js";
import { Upgrade } from "../../base/Upgrade/abstraction.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";
import { createMockPackageJsonFile } from "./__tests__/mockPackageJsonFile.js";
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
    container.register(Upgrade620);
    return container;
};

describe("Upgrade 6.2.0 - canHandle", () => {
    let upgrade: Upgrade.Interface;

    beforeEach(() => {
        upgrade = createContainer().resolve(Upgrade);
    });

    it("returns true when current is below 6.2.0 and target is 6.2.0", async () => {
        expect(await upgrade.canHandle(params("6.2.0", "6.1.0"))).toBe(true);
    });

    it("returns true when target is above 6.2.0 and current is below 6.2.0", async () => {
        expect(await upgrade.canHandle(params("6.3.0", "6.1.0"))).toBe(true);
    });

    it("returns false when current is already at 6.2.0", async () => {
        expect(await upgrade.canHandle(params("6.2.0", "6.2.0"))).toBe(false);
    });

    it("returns false when current is above 6.2.0", async () => {
        expect(await upgrade.canHandle(params("6.3.0", "6.2.0"))).toBe(false);
    });

    it("returns false when target is below 6.2.0", async () => {
        expect(await upgrade.canHandle(params("6.1.0", "6.0.0"))).toBe(false);
    });

    it("returns true when target is a pre-release of 6.2.0 and current is below 6.2.0", async () => {
        expect(await upgrade.canHandle(params("6.2.0-beta.0", "6.1.0"))).toBe(true);
        expect(await upgrade.canHandle(params("6.2.0-unstable.0", "6.1.0"))).toBe(true);
        expect(await upgrade.canHandle(params("6.2.0-alpha.1", "6.1.0"))).toBe(true);
    });

    it("returns true when current is a pre-release of 6.2.0 (raw: release > pre-release)", async () => {
        expect(await upgrade.canHandle(params("6.3.0", "6.2.0-beta.0"))).toBe(true);
        expect(await upgrade.canHandle(params("6.3.0", "6.2.0-local-npm.11"))).toBe(true);
    });
});

describe("Upgrade 6.2.0 - execute", () => {
    it("sets react dependencies on package.json", async () => {
        const file = createMockPackageJsonFile({
            devDependencies: {
                react: "17.0.0",
                "react-dom": "17.0.0"
            }
        });
        const container = createContainer(file);
        const upgrade = container.resolve(Upgrade);

        await upgrade.execute();

        expect(file.getDependency("react")).toBe("18.3.1");
        expect(file.getDependency("react-dom")).toBe("18.3.1");
        expect(file.getDevDependency("@types/node")).toBe("24.12.2");
        expect(file.getDevDependency("@types/react")).toBe("18.3.28");
        expect(file.getDevDependency("@types/react-dom")).toBe("18.3.7");
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

        await expect(upgrade.execute()).rejects.toThrow("Failed to load package.json");
    });
});
