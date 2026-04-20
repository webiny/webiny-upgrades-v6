import { describe, expect, it, vi } from "vitest";
import { Container } from "@webiny/di";
import { UpWebiny as UpWebinyImpl } from "./UpWebiny.js";
import { UpWebiny } from "./abstraction.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";
import { createMockPackageJsonFile } from "../../__tests__/utils/mockPackageJsonFile.js";
import { Version } from "../../base/Version/index.js";
import type { PackageJsonFile } from "../../service/PackageJson/abstraction.js";

const v = (version: string) => Version.create(version);

const createContainer = (file: PackageJsonFile.Interface | null = createMockPackageJsonFile()) => {
    const container = new Container();
    container.registerInstance(PackageJsonTool, {
        load: vi.fn().mockReturnValue(file),
        loadOrThrow: vi.fn().mockImplementation(() => {
            if (!file) {
                throw new Error("Failed to load package.json");
            }
            return file;
        }),
        save: vi.fn()
    });
    container.register(UpWebinyImpl);
    return container;
};

describe("UpWebiny", () => {
    describe("execute", () => {
        it("throws when package.json cannot be loaded", async () => {
            const tool = createContainer(null).resolve(UpWebiny);
            expect(() => tool.execute({ version: v("6.1.0") })).toThrow(
                "Failed to load package.json"
            );
        });

        it("sets webiny dependency to the target version and removes it from devDependencies", async () => {
            const file = createMockPackageJsonFile({
                devDependencies: { webiny: "6.0.0" }
            });
            const tool = createContainer(file).resolve(UpWebiny);
            tool.execute({ version: v("6.1.0") });
            expect(file.getDependency("webiny")).toBe("6.1.0");
            expect(file.getDevDependency("webiny")).toBeNull();
        });

        it("updates @webiny/* packages in dependencies", async () => {
            const file = createMockPackageJsonFile({
                dependencies: {
                    "@webiny/cli": "6.0.0",
                    lodash: "4.17.21"
                }
            });
            const tool = createContainer(file).resolve(UpWebiny);
            tool.execute({ version: v("6.1.0") });
            expect(file.getDependency("@webiny/cli")).toBe("6.1.0");
            expect(file.getDependency("lodash")).toBe("4.17.21");
        });

        it("moves @webiny/* packages from devDependencies to dependencies", async () => {
            const file = createMockPackageJsonFile({
                devDependencies: {
                    "@webiny/app-serverless-cms": "6.0.0",
                    vitest: "4.0.0"
                }
            });
            const tool = createContainer(file).resolve(UpWebiny);
            tool.execute({ version: v("6.1.0") });
            expect(file.getDependency("@webiny/app-serverless-cms")).toBe("6.1.0");
            expect(file.getDevDependency("@webiny/app-serverless-cms")).toBeNull();
            expect(file.getDevDependency("vitest")).toBe("4.0.0");
        });

        it("moves @webiny/* packages from peerDependencies to dependencies", async () => {
            const file = createMockPackageJsonFile({
                peerDependencies: {
                    "@webiny/react": "6.0.0"
                }
            });
            const tool = createContainer(file).resolve(UpWebiny);
            tool.execute({ version: v("6.1.0") });
            expect(file.getDependency("@webiny/react")).toBe("6.1.0");
            expect(file.getPeerDependency("@webiny/react")).toBeNull();
        });

        it("updates @webiny/* packages in resolutions", async () => {
            const file = createMockPackageJsonFile({
                resolutions: {
                    "@webiny/cli": "6.0.0"
                }
            });
            const tool = createContainer(file).resolve(UpWebiny);
            tool.execute({ version: v("6.1.0") });
            expect(file.getResolution("@webiny/cli")).toBe("6.1.0");
        });

        it("moves @webiny/cognito from devDependencies to dependencies", async () => {
            const file = createMockPackageJsonFile({
                devDependencies: { "@webiny/cognito": "6.0.0" }
            });
            const tool = createContainer(file).resolve(UpWebiny);
            tool.execute({ version: v("6.1.0") });
            expect(file.getDependency("@webiny/cognito")).toBe("6.1.0");
            expect(file.getDevDependency("@webiny/cognito")).toBeNull();
        });

        it("updates @webiny/cognito in dependencies when already present", async () => {
            const file = createMockPackageJsonFile({
                dependencies: { "@webiny/cognito": "6.0.0" }
            });
            const tool = createContainer(file).resolve(UpWebiny);
            tool.execute({ version: v("6.1.0") });
            expect(file.getDependency("@webiny/cognito")).toBe("6.1.0");
        });

        it("saves package.json after updating dependencies", async () => {
            const file = createMockPackageJsonFile();
            const container = createContainer(file);
            const packageJsonTool = container.resolve(PackageJsonTool);
            const tool = container.resolve(UpWebiny);
            tool.execute({ version: v("6.1.0") });
            expect(packageJsonTool.save).toHaveBeenCalledWith(file);
        });
    });
});
