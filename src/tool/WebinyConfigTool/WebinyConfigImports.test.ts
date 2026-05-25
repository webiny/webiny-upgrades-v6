import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Project, ts } from "ts-morph";
import { WebinyConfigImports } from "./WebinyConfigImports.js";
import { createMockLogger } from "../../__tests__/utils/mockLogger.js";

const FIXTURE = `export const Extensions = () => {
    return (
        <>
            <ProjectAws />
        </>
    );
};
`;

const WITH_IMPORT_FIXTURE = `import { Infra } from "@webiny/extensions";

export const Extensions = () => {
    return (
        <>
            <ProjectAws />
        </>
    );
};
`;

const WITH_TWO_IMPORTS_FIXTURE = `import { Infra, Api } from "@webiny/extensions";

export const Extensions = () => {
    return (
        <>
            <ProjectAws />
        </>
    );
};
`;

describe("WebinyConfigImports — add", () => {
    let tmpDir: string;
    let filePath: string;
    let logger: ReturnType<typeof createMockLogger>;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "webiny-config-test-"));
        filePath = path.join(tmpDir, "webiny.config.tsx");
        logger = createMockLogger();
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true });
    });

    const createImports = (content: string, log = logger) => {
        fs.writeFileSync(filePath, content, "utf-8");
        const project = new Project({
            compilerOptions: { jsx: ts.JsxEmit.ReactJSX },
            skipAddingFilesFromTsConfig: true
        });
        const sourceFile = project.addSourceFileAtPath(filePath);
        return {
            imports: new WebinyConfigImports(sourceFile, log),
            save: () => sourceFile.saveSync(),
            read: () => fs.readFileSync(filePath, "utf-8")
        };
    };

    it("adds a new import declaration when no import from the package exists", () => {
        const { imports, save, read } = createImports(FIXTURE);
        imports.add({ package: "@webiny/extensions", imports: ["Infra"] });
        save();
        expect(read()).toContain('import { Infra } from "@webiny/extensions"');
    });

    it("adds a named import to an existing import from the same package", () => {
        const { imports, save, read } = createImports(WITH_IMPORT_FIXTURE);
        imports.add({ package: "@webiny/extensions", imports: ["Api"] });
        save();
        const content = read();
        expect(content).toContain("Infra");
        expect(content).toContain("Api");
        const count = (content.match(/from "@webiny\/extensions"/g) ?? []).length;
        expect(count).toBe(1);
    });

    it("supports aliased imports using { name: alias } syntax", () => {
        const { imports, save, read } = createImports(FIXTURE);
        imports.add({
            package: "@webiny/extensions",
            imports: [{ Infra: "Infrastructure" }]
        });
        save();
        expect(read()).toContain("Infra as Infrastructure");
    });

    it("skips a duplicate and does not add the import a second time", () => {
        const { imports, save, read } = createImports(WITH_IMPORT_FIXTURE);
        imports.add({ package: "@webiny/extensions", imports: ["Infra"] });
        save();
        const count = (read().match(/\bInfra\b/g) ?? []).length;
        expect(count).toBe(1);
    });

    it("warns when skipping a duplicate named import", () => {
        const { imports } = createImports(WITH_IMPORT_FIXTURE);
        imports.add({ package: "@webiny/extensions", imports: ["Infra"] });
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("Infra"));
    });

    it("handles multiple imports in a single call", () => {
        const { imports, save, read } = createImports(FIXTURE);
        imports.add({ package: "@webiny/extensions", imports: ["Infra", "Api"] });
        save();
        const content = read();
        expect(content).toContain("Infra");
        expect(content).toContain("Api");
        const count = (content.match(/from "@webiny\/extensions"/g) ?? []).length;
        expect(count).toBe(1);
    });

    it("adds an aliased import to an existing import declaration", () => {
        const { imports, save, read } = createImports(WITH_IMPORT_FIXTURE);
        imports.add({
            package: "@webiny/extensions",
            imports: [{ Api: "WebinyApi" }]
        });
        save();
        const content = read();
        expect(content).toContain("Api as WebinyApi");
        expect(content).toContain("Infra");
        const count = (content.match(/from "@webiny\/extensions"/g) ?? []).length;
        expect(count).toBe(1);
    });

    it("handles a mix of plain and aliased imports in a single call", () => {
        const { imports, save, read } = createImports(FIXTURE);
        imports.add({
            package: "@webiny/extensions",
            imports: ["Api", { Infra: "Infrastructure" }]
        });
        save();
        const content = read();
        expect(content).toContain("Api");
        expect(content).toContain("Infra as Infrastructure");
    });
});

describe("WebinyConfigImports — remove", () => {
    let tmpDir: string;
    let filePath: string;
    let logger: ReturnType<typeof createMockLogger>;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "webiny-config-test-"));
        filePath = path.join(tmpDir, "webiny.config.tsx");
        logger = createMockLogger();
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true });
    });

    const createImports = (content: string, log = logger) => {
        fs.writeFileSync(filePath, content, "utf-8");
        const project = new Project({
            compilerOptions: { jsx: ts.JsxEmit.ReactJSX },
            skipAddingFilesFromTsConfig: true
        });
        const sourceFile = project.addSourceFileAtPath(filePath);
        return {
            imports: new WebinyConfigImports(sourceFile, log),
            save: () => sourceFile.saveSync(),
            read: () => fs.readFileSync(filePath, "utf-8")
        };
    };

    it("removes the entire import declaration when no imports array is given", () => {
        const { imports, save, read } = createImports(WITH_IMPORT_FIXTURE);
        imports.remove({ package: "@webiny/extensions" });
        save();
        expect(read()).not.toContain("@webiny/extensions");
    });

    it("is a no-op when the package is not imported", () => {
        const { imports, save, read } = createImports(FIXTURE);
        imports.remove({ package: "@webiny/extensions" });
        save();
        expect(read()).toBe(FIXTURE);
    });

    it("removes only the specified named import, keeping the rest", () => {
        const { imports, save, read } = createImports(WITH_TWO_IMPORTS_FIXTURE);
        imports.remove({ package: "@webiny/extensions", imports: ["Api"] });
        save();
        const content = read();
        expect(content).not.toContain("Api");
        expect(content).toContain("Infra");
        expect(content).toContain("@webiny/extensions");
    });

    it("removes multiple named imports in a single call", () => {
        const { imports, save, read } = createImports(WITH_TWO_IMPORTS_FIXTURE);
        imports.remove({ package: "@webiny/extensions", imports: ["Infra", "Api"] });
        save();
        expect(read()).not.toContain("@webiny/extensions");
    });

    it("silently ignores a named import that is not present", () => {
        const { imports, save, read } = createImports(WITH_IMPORT_FIXTURE);
        imports.remove({ package: "@webiny/extensions", imports: ["NonExistent"] });
        save();
        expect(read()).toContain("Infra");
        expect(logger.warn).not.toHaveBeenCalled();
    });

    it("removes the whole declaration when all named imports are removed", () => {
        const { imports, save, read } = createImports(WITH_IMPORT_FIXTURE);
        imports.remove({ package: "@webiny/extensions", imports: ["Infra"] });
        save();
        expect(read()).not.toContain("@webiny/extensions");
    });

    it("removes only present names and ignores absent ones in the same call", () => {
        const { imports, save, read } = createImports(WITH_TWO_IMPORTS_FIXTURE);
        imports.remove({ package: "@webiny/extensions", imports: ["Api", "NonExistent"] });
        save();
        const content = read();
        expect(content).not.toContain("Api");
        expect(content).toContain("Infra");
    });
});
