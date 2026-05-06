import path from "node:path";
import { vi } from "vitest";
import type { Container as DIContainer } from "@webiny/di";
import { Context } from "../../base/Context/index.js";
import { Version } from "../../base/Version/index.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";
import { WebinyConfigTool } from "../../tool/WebinyConfigTool/index.js";
import { PackageJsonLoadError } from "../../service/PackageJson/index.js";
import { PackageManagerService } from "../../service/PackageManager/index.js";
import { ReferencesService } from "../../service/References/index.js";
import type { PackageJsonFile } from "../../service/PackageJson/abstraction.js";

const MOCK_CWD = "/project";

/**
 * Registers mock instances of PackageJsonTool, ReferencesService, PackageManagerService,
 * and Context into the container. Pass a file (or null) to control what
 * PackageJsonTool.load returns. PackageManagerService.name() defaults to "yarn" to match
 * the mock package.json fixture (packageManager: "yarn@4.10.0").
 */
export const registerUpgradeDeps = (
    container: DIContainer,
    file: PackageJsonFile.Interface | null
): void => {
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
    container.registerInstance(WebinyConfigTool, {
        read: vi.fn().mockReturnValue({ addChild: vi.fn(), save: vi.fn() }),
        save: vi.fn()
    });
    container.registerInstance(ReferencesService, {
        getReference: vi.fn().mockReturnValue(null),
        getVersion: vi.fn().mockReturnValue(null)
    });
    container.registerInstance(PackageManagerService, {
        install: vi.fn().mockResolvedValue(undefined),
        version: vi.fn(),
        name: vi.fn().mockReturnValue("yarn"),
        update: vi.fn().mockResolvedValue(undefined)
    });
    container.registerInstance(Context, {
        cwd: MOCK_CWD,
        registry: "https://registry.npmjs.org",
        inputVersion: "0.0.0",
        targetVersion: Version.create("0.0.0"),
        installedVersion: Version.create("0.0.0"),
        currentVersion: Version.create("0.0.0"),
        setCurrentVersion: vi.fn(),
        resolve: (...segments: string[]) => path.join(MOCK_CWD, ...segments)
    });
};
