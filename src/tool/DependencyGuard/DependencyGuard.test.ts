import { describe, expect, it, vi, beforeEach } from "vitest";
import { Container } from "@webiny/di";
import { DependencyGuard as DependencyGuardImpl } from "./DependencyGuard.js";
import { DependencyGuard } from "./abstraction.js";
import { Context } from "../../base/Context/index.js";
import { Input } from "../../base/Input/index.js";
import { Logger } from "../../base/Logger/index.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";
import { PackageJsonLoadError } from "../../service/PackageJson/index.js";
import { ReferencesFileMissingError } from "../../service/References/index.js";
import { ReferencesService as ReferencesServiceImpl } from "../../service/References/ReferencesService.js";
import { createMockPackageJsonFile } from "../../__tests__/utils/mockPackageJsonFile.js";

vi.mock("load-json-file", () => ({
    loadJsonFileSync: vi.fn()
}));

import { loadJsonFileSync } from "load-json-file";
const mockLoadJsonFileSync = vi.mocked(loadJsonFileSync);

const makeReferences = (
    overrides: {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        peerDependencies?: Record<string, string>;
        resolutions?: Record<string, string>;
    } = {}
) => {
    const all = {
        ...overrides.dependencies,
        ...overrides.devDependencies,
        ...overrides.peerDependencies,
        ...overrides.resolutions
    };
    return {
        references: Object.entries(all).map(([name, version]) => ({
            name,
            versions: [{ version }]
        }))
    };
};

const createContainer = (
    options: {
        cwd?: string;
        skipDependencyGuard?: boolean;
        packageJsonData?: Parameters<typeof createMockPackageJsonFile>[0];
        packageJsonFile?: ReturnType<typeof createMockPackageJsonFile> | null;
        references?: object;
    } = {}
) => {
    const {
        cwd = "/project",
        references = makeReferences(),
        skipDependencyGuard = false
    } = options;
    const file =
        options.packageJsonFile !== undefined
            ? options.packageJsonFile
            : createMockPackageJsonFile(options.packageJsonData);

    mockLoadJsonFileSync.mockReturnValue(references as any);

    const container = new Container();
    container.registerInstance(Context, {
        cwd,
        resolve: vi.fn().mockReturnValue(`${cwd}/node_modules/@webiny/cli/files/references.json`)
    } as unknown as Context.Interface);
    container.registerInstance(Input, { skipDependencyGuard } as Input.Interface);
    container.registerInstance(Logger, {
        info: vi.fn(),
        debug: vi.fn(),
        warning: vi.fn(),
        error: vi.fn()
    } as unknown as Logger.Interface);
    container.registerInstance(PackageJsonTool, {
        load: vi.fn().mockReturnValue(file),
        loadOrThrow: vi.fn().mockImplementation(() => {
            if (!file) {
                throw new PackageJsonLoadError("/project/package.json");
            }
            return file;
        }),
        save: vi.fn()
    });
    container.register(ReferencesServiceImpl);
    container.register(DependencyGuardImpl);
    return container;
};

describe("DependencyGuard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("verify", () => {
        it("returns empty array when user has no packages in references", () => {
            const guard = createContainer({
                packageJsonData: { dependencies: { lodash: "4.17.21" } },
                references: makeReferences({ dependencies: { react: "18.2.0" } })
            }).resolve(DependencyGuard);

            expect(guard.execute()).toEqual([]);
        });

        it("returns empty array when all matching packages have the same version", () => {
            const guard = createContainer({
                packageJsonData: { dependencies: { react: "18.2.0" } },
                references: makeReferences({ dependencies: { react: "18.2.0" } })
            }).resolve(DependencyGuard);

            expect(guard.execute()).toEqual([]);
        });

        it("returns a mismatch when versions differ", () => {
            const guard = createContainer({
                packageJsonData: { dependencies: { react: "17.0.0" } },
                references: makeReferences({ dependencies: { react: "18.2.0" } })
            }).resolve(DependencyGuard);

            expect(guard.execute()).toEqual([
                { name: "react", userVersion: "17.0.0", expectedVersion: "18.2.0" }
            ]);
        });

        it("strips range prefixes before comparing — treats ^18.2.0 as matching 18.2.0", () => {
            const guard = createContainer({
                packageJsonData: { dependencies: { react: "^18.2.0" } },
                references: makeReferences({ dependencies: { react: "18.2.0" } })
            }).resolve(DependencyGuard);

            expect(guard.execute()).toEqual([]);
        });

        it("strips range prefixes from references version too", () => {
            const guard = createContainer({
                packageJsonData: { dependencies: { react: "18.2.0" } },
                references: makeReferences({ dependencies: { react: "^18.2.0" } })
            }).resolve(DependencyGuard);

            expect(guard.execute()).toEqual([]);
        });

        it("checks devDependencies", () => {
            const guard = createContainer({
                packageJsonData: { devDependencies: { typescript: "4.0.0" } },
                references: makeReferences({ devDependencies: { typescript: "5.0.0" } })
            }).resolve(DependencyGuard);

            expect(guard.execute()).toEqual([
                { name: "typescript", userVersion: "4.0.0", expectedVersion: "5.0.0" }
            ]);
        });

        it("checks peerDependencies", () => {
            const guard = createContainer({
                packageJsonData: { peerDependencies: { react: "17.0.0" } },
                references: makeReferences({ peerDependencies: { react: "18.2.0" } })
            }).resolve(DependencyGuard);

            expect(guard.execute()).toEqual([
                { name: "react", userVersion: "17.0.0", expectedVersion: "18.2.0" }
            ]);
        });

        it("checks resolutions", () => {
            const guard = createContainer({
                packageJsonData: { resolutions: { lodash: "4.17.20" } },
                references: makeReferences({ resolutions: { lodash: "4.17.21" } })
            }).resolve(DependencyGuard);

            expect(guard.execute()).toEqual([
                { name: "lodash", userVersion: "4.17.20", expectedVersion: "4.17.21" }
            ]);
        });

        it("collects mismatches across multiple sections", () => {
            const guard = createContainer({
                packageJsonData: {
                    dependencies: { react: "17.0.0" },
                    devDependencies: { typescript: "4.0.0" }
                },
                references: makeReferences({
                    dependencies: { react: "18.2.0" },
                    devDependencies: { typescript: "5.0.0" }
                })
            }).resolve(DependencyGuard);

            const result = guard.execute();
            expect(result).toHaveLength(2);
            expect(result).toContainEqual({
                name: "react",
                userVersion: "17.0.0",
                expectedVersion: "18.2.0"
            });
            expect(result).toContainEqual({
                name: "typescript",
                userVersion: "4.0.0",
                expectedVersion: "5.0.0"
            });
        });

        it("ignores packages missing from references entirely", () => {
            const guard = createContainer({
                packageJsonData: { dependencies: { lodash: "4.17.21", react: "17.0.0" } },
                references: makeReferences({ dependencies: { react: "18.2.0" } })
            }).resolve(DependencyGuard);

            const result = guard.execute();
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe("react");
        });

        it("handles missing sections in references gracefully", () => {
            const guard = createContainer({
                packageJsonData: { dependencies: { react: "18.2.0" } },
                references: makeReferences({ dependencies: { lodash: "4.17.21" } }) // react not in references
            }).resolve(DependencyGuard);

            expect(guard.execute()).toEqual([]);
        });

        it("skips packages in the SKIP_PACKAGES list even when versions differ", () => {
            const guard = createContainer({
                packageJsonData: { dependencies: { eslint: "8.0.0", prettier: "2.0.0" } },
                references: makeReferences({
                    dependencies: { eslint: "9.0.0", prettier: "3.0.0" }
                })
            }).resolve(DependencyGuard);

            expect(guard.execute()).toEqual([]);
        });

        it("throws when package.json cannot be loaded", () => {
            const guard = createContainer({ packageJsonFile: null }).resolve(DependencyGuard);
            expect(() => guard.execute()).toThrow(PackageJsonLoadError);
        });

        it("returns empty array immediately when skipDependencyGuard is true", () => {
            const guard = createContainer({
                skipDependencyGuard: true,
                packageJsonData: { dependencies: { react: "17.0.0" } },
                references: makeReferences({ dependencies: { react: "18.2.0" } })
            }).resolve(DependencyGuard);

            expect(guard.execute()).toEqual([]);
            expect(mockLoadJsonFileSync).not.toHaveBeenCalled();
        });

        it("throws when references.json cannot be read", () => {
            const guard = createContainer().resolve(DependencyGuard);
            mockLoadJsonFileSync.mockImplementation(() => {
                throw new Error("ENOENT");
            });
            expect(() => guard.execute()).toThrow(ReferencesFileMissingError);
        });
    });
});
