import { beforeEach, describe, expect, it, vi } from "vitest";
import { Container } from "@webiny/di";
import { Upgrade as Upgrade660 } from "./Upgrade.js";
import { Upgrade } from "../../base/Upgrade/abstraction.js";
import { WebinyConfigTool } from "../../tool/WebinyConfigTool/index.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";
import { createMockPackageJsonFile } from "../../__tests__/utils/mockPackageJsonFile.js";
import type { PackageJsonFile } from "../../service/PackageJson/abstraction.js";
import { Version } from "../../base/Version/index.js";

const v = (version: string) => Version.create(version);

const params = (target: string, current: string) => ({
    targetVersion: v(target),
    currentVersion: v(current)
});

const createContainer = (
    packageJsonFile: PackageJsonFile.Interface = createMockPackageJsonFile({
        dependencies: { webiny: "6.5.0", "@webiny/cli": "6.5.0" }
    })
) => {
    const container = new Container();
    container.registerInstance(PackageJsonTool, {
        load: vi.fn().mockReturnValue(packageJsonFile),
        loadOrThrow: vi.fn().mockReturnValue(packageJsonFile),
        save: vi.fn()
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
    container.register(Upgrade660);
    return container;
};

describe("Upgrade 6.6.0 - canHandle", () => {
    let upgrade: Upgrade.Interface;

    beforeEach(() => {
        vi.clearAllMocks();
        upgrade = createContainer().resolve(Upgrade);
    });

    it("returns true when current is below 6.6.0 and target is 6.6.0", async () => {
        expect(await upgrade.canHandle(params("6.6.0", "6.5.1"))).toBe(true);
    });

    it("returns true when target is above 6.6.0 and current is below 6.6.0", async () => {
        expect(await upgrade.canHandle(params("6.7.0", "6.5.0"))).toBe(true);
    });

    it("returns false when current is already at 6.6.0", async () => {
        expect(await upgrade.canHandle(params("6.6.0", "6.6.0"))).toBe(false);
    });

    it("returns false when target is below 6.6.0", async () => {
        expect(await upgrade.canHandle(params("6.5.1", "6.5.0"))).toBe(false);
    });

    it("returns true when target is a pre-release of 6.6.0 and current is below 6.6.0", async () => {
        expect(await upgrade.canHandle(params("6.6.0-beta.0", "6.5.1"))).toBe(true);
    });
});

describe("Upgrade 6.6.0 - execute", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("adds Infra.Core.DynamoDb.Pitr and Infra.Core.S3Bucket.Versioning with enabled={false}", async () => {
        const container = createContainer();
        const webinyConfigTool = container.resolve(WebinyConfigTool);
        await container.resolve(Upgrade).execute();

        const mockFile = vi.mocked(webinyConfigTool.read).mock.results[0].value;
        expect(mockFile.jsx.addChild).toHaveBeenCalledWith(
            "Infra.Core.DynamoDb.Pitr",
            expect.objectContaining({ props: { enabled: "false" } })
        );
        expect(mockFile.jsx.addChild).toHaveBeenCalledWith(
            "Infra.Core.S3Bucket.Versioning",
            expect.objectContaining({ props: { enabled: "false" } })
        );
        expect(webinyConfigTool.save).toHaveBeenCalledWith(mockFile);
    });

    it("replaces @webiny/cli with @webiny/cli-aws and adds the two optional peers of webiny", async () => {
        const file = createMockPackageJsonFile({
            dependencies: { webiny: "6.5.0", "@webiny/cli": "6.5.0" }
        });
        const container = createContainer(file);
        await container.resolve(Upgrade).execute();

        expect(file.getDependency("@webiny/cli")).toBeNull();
        expect(file.getDependency("@webiny/cli-aws")).toBe("6.6.0");
        expect(file.getDependency("@webiny/project-aws")).toBe("6.6.0");
        expect(file.getDependency("@webiny/db-dynamodb")).toBe("6.6.0");
        expect(container.resolve(PackageJsonTool).save).toHaveBeenCalledWith(file);
    });

    it("replaces @webiny/cli when it is in devDependencies", async () => {
        const file = createMockPackageJsonFile({
            dependencies: { webiny: "6.5.0" },
            devDependencies: { "@webiny/cli": "6.5.0" }
        });
        await createContainer(file).resolve(Upgrade).execute();

        expect(file.getDevDependency("@webiny/cli")).toBeNull();
        expect(file.getDependency("@webiny/cli-aws")).toBe("6.6.0");
    });

    it("leaves package.json alone when the project has no @webiny/cli", async () => {
        const file = createMockPackageJsonFile({
            dependencies: { webiny: "6.5.0", "@webiny/cli-standalone": "6.5.0" }
        });
        const container = createContainer(file);
        await container.resolve(Upgrade).execute();

        expect(file.getDependency("@webiny/cli-aws")).toBeNull();
        expect(file.getDependency("@webiny/db-dynamodb")).toBeNull();
        expect(container.resolve(PackageJsonTool).save).not.toHaveBeenCalled();
    });
});
