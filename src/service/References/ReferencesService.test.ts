import { describe, it, expect, vi, beforeEach } from "vitest";
import { Container } from "@webiny/di";
import { ReferencesService as ReferencesServiceImpl } from "./ReferencesService.js";
import { ReferencesService } from "./abstractions.js";
import { ReferencesFileInvalidError } from "./ReferencesFileInvalidError.js";
import { ReferencesFileMissingError } from "./ReferencesFileMissingError.js";
import { Context } from "../../base/Context/abstraction.js";

vi.mock("load-json-file", () => ({ loadJsonFileSync: vi.fn() }));

import { loadJsonFileSync } from "load-json-file";

const createContainer = () => {
    const container = new Container();
    container.registerInstance(Context, {
        cwd: "/project",
        resolve: (...segments: string[]) => segments.join("/")
    } as unknown as Context.Interface);
    container.register(ReferencesServiceImpl);
    return container;
};

const mockReferences = (references: unknown[]) => {
    (loadJsonFileSync as any).mockReturnValue({ references });
};

describe("ReferencesService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getReference", () => {
        it("returns a reference by name", () => {
            mockReferences([{ name: "@webiny/cli", versions: [{ version: "6.1.0", files: [] }] }]);
            const service = createContainer().resolve(ReferencesService);
            const ref = service.getReference("@webiny/cli");
            expect(ref?.name).toBe("@webiny/cli");
        });

        it("returns null when reference is not found", () => {
            mockReferences([{ name: "@webiny/cli", versions: [{ version: "6.1.0", files: [] }] }]);
            const service = createContainer().resolve(ReferencesService);
            expect(service.getReference("@webiny/nonexistent")).toBeNull();
        });
    });

    describe("getVersion", () => {
        it("returns the first version string for a package", () => {
            mockReferences([{ name: "@webiny/cli", versions: [{ version: "6.1.0", files: [] }] }]);
            const service = createContainer().resolve(ReferencesService);
            expect(service.getVersion("@webiny/cli")).toBe("6.1.0");
        });

        it("returns null when package has no versions", () => {
            mockReferences([{ name: "@webiny/cli", versions: [] }]);
            const service = createContainer().resolve(ReferencesService);
            expect(service.getVersion("@webiny/cli")).toBeNull();
        });

        it("returns null when first version entry has empty version string", () => {
            mockReferences([{ name: "@webiny/cli", versions: [{ version: "", files: [] }] }]);
            const service = createContainer().resolve(ReferencesService);
            expect(service.getVersion("@webiny/cli")).toBeNull();
        });

        it("returns null when package is not found", () => {
            mockReferences([{ name: "@webiny/cli", versions: [{ version: "6.1.0", files: [] }] }]);
            const service = createContainer().resolve(ReferencesService);
            expect(service.getVersion("@webiny/nonexistent")).toBeNull();
        });
    });

    describe("cache", () => {
        it("loads the file only once across multiple calls", () => {
            mockReferences([{ name: "@webiny/cli", versions: [{ version: "6.1.0", files: [] }] }]);
            const service = createContainer().resolve(ReferencesService);
            service.getReference("@webiny/cli");
            service.getReference("@webiny/cli");
            expect(loadJsonFileSync).toHaveBeenCalledTimes(1);
        });
    });

    describe("error handling", () => {
        it("throws ReferencesFileMissingError when references.json cannot be loaded", () => {
            (loadJsonFileSync as any).mockImplementation(() => {
                throw new Error("ENOENT");
            });
            const service = createContainer().resolve(ReferencesService);
            expect(() => service.getReference("@webiny/cli")).toThrow(ReferencesFileMissingError);
        });

        it("throws ReferencesFileInvalidError when references.json has no references array", () => {
            (loadJsonFileSync as any).mockReturnValue({});
            const service = createContainer().resolve(ReferencesService);
            expect(() => service.getReference("@webiny/cli")).toThrow(ReferencesFileInvalidError);
        });

        it("throws ReferencesFileInvalidError when references array is empty", () => {
            (loadJsonFileSync as any).mockReturnValue({ references: [] });
            const service = createContainer().resolve(ReferencesService);
            expect(() => service.getReference("@webiny/cli")).toThrow(ReferencesFileInvalidError);
        });
    });
});
