import { describe, it, expect, vi, beforeEach } from "vitest";
import { Container } from "@webiny/di";
import { PackageJsonService as PackageJsonServiceImpl } from "./PackageJsonService.js";
import { PackageJsonService } from "./abstraction.js";
import { Logger } from "../../base/Logger/abstraction.js";
import { createMockLogger } from "../../__tests__/utils/mockLogger.js";

vi.mock("load-json-file", () => ({
    loadJsonFileSync: vi.fn()
}));

vi.mock("write-json-file", () => ({
    writeJsonFileSync: vi.fn()
}));

import { loadJsonFileSync } from "load-json-file";
import { writeJsonFileSync } from "write-json-file";

const createContainer = () => {
    const container = new Container();
    container.registerInstance(Logger, createMockLogger());
    container.register(PackageJsonServiceImpl);
    return container;
};

describe("PackageJsonService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("load", () => {
        it("returns a PackageJsonFile when the file exists", () => {
            const raw = { name: "my-app", version: "1.0.0" };
            (loadJsonFileSync as any).mockReturnValue(raw);

            const service = createContainer().resolve(PackageJsonService);
            const file = service.load("/project/package.json");

            expect(file).not.toBeNull();
            expect(file!.path).toBe("/project/package.json");
            expect(file!.raw).toBe(raw);
        });

        it("reads from the given path", () => {
            (loadJsonFileSync as any).mockReturnValue({});

            const service = createContainer().resolve(PackageJsonService);
            service.load("/some/other/package.json");

            expect(loadJsonFileSync).toHaveBeenCalledWith("/some/other/package.json");
        });

        it("returns null and logs an error when loading fails", () => {
            (loadJsonFileSync as any).mockImplementation(() => {
                throw new Error("ENOENT: file not found");
            });

            const container = createContainer();
            const logger = container.resolve(Logger);
            const service = container.resolve(PackageJsonService);

            const result = service.load("/missing/package.json");

            expect(result).toBeNull();
            expect(logger.error).toHaveBeenCalledWith("ENOENT: file not found");
        });
    });

    describe("save", () => {
        it("writes the file's raw content to its path", () => {
            (loadJsonFileSync as any).mockReturnValue({});
            const container = createContainer();
            const service = container.resolve(PackageJsonService);
            const file = service.load("/project/package.json")!;

            service.save(file);

            expect(writeJsonFileSync).toHaveBeenCalledWith("/project/package.json", file.raw);
        });
    });
});
