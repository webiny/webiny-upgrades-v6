import { describe, it, expect } from "vitest";
import { ReferencesService } from "./ReferencesService.js";
import type { IReference } from "./abstractions.js";

const createService = (references: unknown[]) => {
    return new ReferencesService(references as IReference[]);
};

describe("ReferencesService", () => {
    describe("getReference", () => {
        it("returns a reference by name", () => {
            const service = createService([
                { name: "@webiny/cli", versions: [{ version: "6.1.0", files: [] }] }
            ]);
            const ref = service.getReference("@webiny/cli");
            expect(ref?.name).toBe("@webiny/cli");
        });

        it("returns null when reference is not found", () => {
            const service = createService([
                { name: "@webiny/cli", versions: [{ version: "6.1.0", files: [] }] }
            ]);
            expect(service.getReference("@webiny/nonexistent")).toBeNull();
        });
    });

    describe("getVersion", () => {
        it("returns the first version string for a package", () => {
            const service = createService([
                { name: "@webiny/cli", versions: [{ version: "6.1.0", files: [] }] }
            ]);
            expect(service.getVersion("@webiny/cli")).toBe("6.1.0");
        });

        it("returns null when package has no versions", () => {
            const service = createService([{ name: "@webiny/cli", versions: [] }]);
            expect(service.getVersion("@webiny/cli")).toBeNull();
        });

        it("returns null when first version entry has empty version string", () => {
            const service = createService([
                { name: "@webiny/cli", versions: [{ version: "", files: [] }] }
            ]);
            expect(service.getVersion("@webiny/cli")).toBeNull();
        });

        it("returns null when package is not found", () => {
            const service = createService([
                { name: "@webiny/cli", versions: [{ version: "6.1.0", files: [] }] }
            ]);
            expect(service.getVersion("@webiny/nonexistent")).toBeNull();
        });
    });
});
