import { beforeEach, describe, expect, it, vi } from "vitest";
import { Container } from "@webiny/di";
import { Upgrade as Upgrade630 } from "./Upgrade.js";
import { Upgrade } from "../../base/Upgrade/abstraction.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";
import { WebinyConfigTool } from "../../tool/WebinyConfigTool/index.js";
import { PackageManagerService } from "../../service/PackageManager/index.js";
import { PackageJsonLoadError } from "../../service/PackageJson/index.js";
import { createMockPackageJsonFile } from "../../__tests__/utils/mockPackageJsonFile.js";
import { registerUpgradeDeps } from "../../__tests__/utils/mockUpgradeDeps.js";
import { Version } from "../../base/Version/index.js";
import type { PackageJsonFile } from "../../service/PackageJson/abstraction.js";
import type { PackageManagerName } from "../../service/PackageManager/detect.js";

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
        name: vi.fn().mockReturnValue(pmName),
        update: vi.fn().mockResolvedValue(undefined)
    });
    const mockWebinyConfigFile = {
        imports: { add: vi.fn(), remove: vi.fn() },
        jsx: { addChild: vi.fn(), insertBefore: vi.fn(), insertAfter: vi.fn() },
        save: vi.fn()
    };
    container.registerInstance(WebinyConfigTool, {
        read: vi.fn().mockReturnValue(mockWebinyConfigFile),
        save: vi.fn()
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

    it("returns true when current is a pre-release of 6.3.0 and target is above 6.3.0", async () => {
        expect(await upgrade.canHandle(params("6.4.0", "6.3.0-beta.0"))).toBe(true);
        expect(await upgrade.canHandle(params("6.4.0", "6.3.0-local-npm.11"))).toBe(true);
    });

    it("returns true when current and target are both pre-releases of 6.3.0", async () => {
        expect(await upgrade.canHandle(params("6.3.0-beta.3", "6.3.0-beta.0"))).toBe(true);
        expect(await upgrade.canHandle(params("6.3.0-beta.3", "6.3.0-beta.1"))).toBe(true);
        expect(await upgrade.canHandle(params("6.3.0-beta.3", "6.3.0-local-npm.11"))).toBe(true);
    });

    it("returns true when current is a pre-release of 6.3.0 and target is 6.3.0", async () => {
        expect(await upgrade.canHandle(params("6.3.0", "6.3.0-beta.0"))).toBe(true);
        expect(await upgrade.canHandle(params("6.3.0", "6.3.0-beta.1"))).toBe(true);
        expect(await upgrade.canHandle(params("6.3.0", "6.3.0-local-npm.11"))).toBe(true);
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

    it("reads webiny.config.tsx via webinyConfigTool", async () => {
        const container = createContainer();
        const webinyConfigTool = container.resolve(WebinyConfigTool);
        const upgrade = container.resolve(Upgrade);
        await upgrade.execute();
        expect(webinyConfigTool.read).toHaveBeenCalled();
    });

    it("calls addChild on the config file with Infra.Env.IsProd and encryption comment", async () => {
        const container = createContainer();
        const webinyConfigTool = container.resolve(WebinyConfigTool);
        const upgrade = container.resolve(Upgrade);
        await upgrade.execute();
        const mockFile = vi.mocked(webinyConfigTool.read).mock.results[0].value;
        expect(mockFile.jsx.addChild).toHaveBeenCalledWith(
            "Infra.Env.IsProd",
            expect.objectContaining({
                comment: expect.stringContaining("Encryption"),
                children: expect.any(Function)
            })
        );
    });

    it("saves the webiny config via webinyConfigTool", async () => {
        const container = createContainer();
        const webinyConfigTool = container.resolve(WebinyConfigTool);
        const upgrade = container.resolve(Upgrade);
        await upgrade.execute();
        const mockFile = vi.mocked(webinyConfigTool.read).mock.results[0].value;
        expect(webinyConfigTool.save).toHaveBeenCalledWith(mockFile);
    });

    it("calls packageManagerService.update when project uses yarn", async () => {
        const container = createContainer(createMockPackageJsonFile(), "yarn");
        const packageManagerService = container.resolve(PackageManagerService);
        const upgrade = container.resolve(Upgrade);
        await upgrade.execute();
        expect(packageManagerService.update).toHaveBeenCalledWith("4.14.1");
    });

    it("does not call packageManagerService.update when project does not use yarn", async () => {
        const container = createContainer(createMockPackageJsonFile(), "npm");
        const packageManagerService = container.resolve(PackageManagerService);
        const upgrade = container.resolve(Upgrade);
        await upgrade.execute();
        expect(packageManagerService.update).not.toHaveBeenCalled();
    });
});
