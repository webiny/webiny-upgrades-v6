import { vi } from "vitest";
import type { Container as DIContainer } from "@webiny/di";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";
import { PackageJsonLoadError } from "../../service/PackageJson/index.js";
import { ReferencesService } from "../../service/References/index.js";
import type { PackageJsonFile } from "../../service/PackageJson/abstraction.js";

/**
 * Registers mock instances of PackageJsonTool and ReferencesService into the container.
 * Pass a file (or null) to control what PackageJsonTool.load returns.
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
    container.registerInstance(ReferencesService, {
        getReference: vi.fn().mockReturnValue(null),
        getVersion: vi.fn().mockReturnValue(null)
    });
};
