import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WebinyConfigFile } from "./WebinyConfigFile.js";
import { createMockLogger } from "../../__tests__/utils/mockLogger.js";

const FIXTURE = `export const Extensions = () => {
    return (
        <>
            <Infra.ProductionEnvironments environments={["prod", "production"]} />
            <ProjectAws />
        </>
    );
};
`;

const EMPTY_FIXTURE = `export const Extensions = () => {
    return (
        <>
        </>
    );
};
`;

const JSX_EXPRESSION_FIXTURE = `export const Extensions = () => {
    return (
        <>
            {someVariable}
            <ProjectAws />
        </>
    );
};
`;

const EMPTY_BLOCK_FIXTURE = `export const Extensions = () => {
    return (
        <>
            <Level1></Level1>
        </>
    );
};
`;

describe("WebinyConfigFile — jsx.addChild", () => {
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

    const createFile = (content = FIXTURE): WebinyConfigFile => {
        fs.writeFileSync(filePath, content, "utf-8");
        return new WebinyConfigFile(filePath, logger);
    };

    const read = (): string => fs.readFileSync(filePath, "utf-8");

    // ── basic insert ───────────────────────────────────────────────────────────

    it("inserts a self-closing element after the last fragment child", () => {
        const file = createFile();
        file.jsx.addChild("Infra.Foo");
        file.save();
        expect(read()).toContain("<Infra.Foo />");
    });

    it("inserts after the last existing child (not before it)", () => {
        const file = createFile();
        file.jsx.addChild("Infra.Foo");
        file.save();
        const content = read();
        expect(content.indexOf("<ProjectAws />")).toBeLessThan(content.indexOf("<Infra.Foo />"));
    });

    it("renders props as JSX expression attributes", () => {
        const file = createFile();
        file.jsx.addChild("Infra.Foo", { props: { bar: '"hello"', n: "42" } });
        file.save();
        expect(read()).toContain('<Infra.Foo bar={"hello"} n={42} />');
    });

    it("renders a comment on the line above the element", () => {
        const file = createFile();
        file.jsx.addChild("Infra.Foo", { comment: "My comment" });
        file.save();
        const content = read();
        expect(content).toContain("{/* My comment */}");
        expect(content.indexOf("{/* My comment */}")).toBeLessThan(
            content.indexOf("<Infra.Foo />")
        );
    });

    it("uses the same indentation as existing fragment children", () => {
        const file = createFile();
        file.jsx.addChild("Infra.Foo");
        file.save();
        expect(read()).toMatch(/^            <Infra\.Foo \/>/m);
    });

    // ── insert with children ───────────────────────────────────────────────────

    it("inserts a block element with children", () => {
        const file = createFile();
        file.jsx.addChild("Infra.Bar", {
            children: b => {
                b.addChild("Infra.Baz");
            }
        });
        file.save();
        const content = read();
        expect(content).toContain("<Infra.Bar>");
        expect(content).toContain("<Infra.Baz />");
        expect(content).toContain("</Infra.Bar>");
    });

    it("indents nested children one level deeper than the parent", () => {
        const file = createFile();
        file.jsx.addChild("Infra.Bar", {
            children: b => {
                b.addChild("Infra.Baz");
            }
        });
        file.save();
        // fragment children in the fixture are at 12 spaces → nested child at 16 spaces
        expect(read()).toMatch(/^                <Infra\.Baz \/>/m);
    });

    // ── duplicate detection ────────────────────────────────────────────────────

    it("does not insert a duplicate element on a second addChild call", () => {
        const file = createFile();
        file.jsx.addChild("Infra.Foo");
        file.jsx.addChild("Infra.Foo");
        file.save();
        const count = (read().match(/<Infra\.Foo \/>/g) ?? []).length;
        expect(count).toBe(1);
    });

    it("warns when attempting to add an element that already exists", () => {
        const file = createFile();
        file.jsx.addChild("ProjectAws"); // already in FIXTURE
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("<ProjectAws>"));
    });

    it("does not warn when the element does not yet exist", () => {
        const file = createFile();
        file.jsx.addChild("Infra.NewThing");
        expect(logger.warn).not.toHaveBeenCalled();
    });

    // ── structural merge ───────────────────────────────────────────────────────

    it("merges children into existing parent instead of duplicating outer element", () => {
        const file = createFile();
        file.jsx.addChild("Infra.Env.IsProd", {
            children: b => {
                b.addChild("Infra.Encryption", { props: { passphrase: 'process.env.X || ""' } });
            }
        });
        file.save();

        const file2 = new WebinyConfigFile(filePath, logger);
        file2.jsx.addChild("Infra.Env.IsProd", {
            children: b => {
                b.addChild("Infra.NewChild");
            }
        });
        file2.save();

        const content = read();
        expect((content.match(/<Infra\.Env\.IsProd>/g) ?? []).length).toBe(1);
        expect(content).toContain("<Infra.Encryption");
        expect(content).toContain("<Infra.NewChild />");
    });

    it("warns when a nested child already exists during structural merge", () => {
        const file = createFile();
        file.jsx.addChild("Infra.Env.IsProd", {
            children: b => {
                b.addChild("Infra.Encryption", { props: { passphrase: 'process.env.X || ""' } });
            }
        });
        file.save();

        const logger2 = createMockLogger();
        const file2 = new WebinyConfigFile(filePath, logger2);
        file2.jsx.addChild("Infra.Env.IsProd", {
            children: b => {
                b.addChild("Infra.Encryption"); // already exists
            }
        });
        expect(logger2.warn).toHaveBeenCalledWith(expect.stringContaining("<Infra.Encryption>"));
    });

    it("handles 3 levels of nesting on initial insert", () => {
        const file = createFile();
        file.jsx.addChild("Level1", {
            children: b1 => {
                b1.addChild("Level2", {
                    children: b2 => {
                        b2.addChild("Level3");
                    }
                });
            }
        });
        file.save();
        const content = read();
        expect(content).toContain("<Level1>");
        expect(content).toContain("<Level2>");
        expect(content).toContain("<Level3 />");
        expect(content).toContain("</Level2>");
        expect(content).toContain("</Level1>");
    });

    it("structural merge at 3 levels deep adds the missing leaf without duplicating parents", () => {
        const file = createFile();
        file.jsx.addChild("Level1", {
            children: b1 => {
                b1.addChild("Level2", {
                    children: b2 => {
                        b2.addChild("Level3a");
                    }
                });
            }
        });
        file.save();

        const file2 = new WebinyConfigFile(filePath, logger);
        file2.jsx.addChild("Level1", {
            children: b1 => {
                b1.addChild("Level2", {
                    children: b2 => {
                        b2.addChild("Level3b");
                    }
                });
            }
        });
        file2.save();

        const content = read();
        expect((content.match(/<Level1>/g) ?? []).length).toBe(1);
        expect((content.match(/<Level2>/g) ?? []).length).toBe(1);
        expect(content).toContain("<Level3a />");
        expect(content).toContain("<Level3b />");
    });

    // ── missing fragment ───────────────────────────────────────────────────────

    it("does nothing and warns when file has no JSX fragment", () => {
        const file = createFile("export const x = 1;");
        file.jsx.addChild("Infra.Foo");
        file.save();
        expect(read()).toBe("export const x = 1;");
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("No JSX fragment"));
    });

    // ── empty fragment ────────────────────────────────────────────────────────

    it("inserts an element into an empty fragment", () => {
        const file = createFile(EMPTY_FIXTURE);
        file.jsx.addChild("NewElement");
        file.save();
        expect(read()).toContain("<NewElement />");
    });

    it("inserts a child into an empty block element via structural merge", () => {
        const file = createFile(EMPTY_BLOCK_FIXTURE);
        file.jsx.addChild("Level1", { children: b => b.addChild("NewChild") });
        file.save();
        expect(read()).toContain("<NewChild />");
    });

    it("skips non-element JSX nodes when searching for duplicates", () => {
        const file = createFile(JSX_EXPRESSION_FIXTURE);
        file.jsx.addChild("NewElement");
        file.save();
        expect(read()).toContain("<NewElement />");
    });

    // ── save ───────────────────────────────────────────────────────────────────

    it("save() writes mutations to disk", () => {
        const file = createFile();
        file.jsx.addChild("Infra.NewThing");
        expect(read()).not.toContain("<Infra.NewThing />");
        file.save();
        expect(read()).toContain("<Infra.NewThing />");
    });
});

// ── imports ───────────────────────────────────────────────────────────────────────────

const WITH_IMPORT_FIXTURE = `import { Infra } from "@webiny/extensions";

export const Extensions = () => {
    return (
        <>
            <ProjectAws />
        </>
    );
};
`;

describe("WebinyConfigFile — imports.add", () => {
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

    const createFile = (content: string): WebinyConfigFile => {
        fs.writeFileSync(filePath, content, "utf-8");
        return new WebinyConfigFile(filePath, logger);
    };

    const read = (): string => fs.readFileSync(filePath, "utf-8");

    it("adds a new import declaration when no import from the package exists", () => {
        const file = createFile(FIXTURE);
        file.imports.add({ package: "@webiny/extensions", imports: ["Infra"] });
        file.save();
        expect(read()).toContain('import { Infra } from "@webiny/extensions"');
    });

    it("adds a named import to an existing import from the same package", () => {
        const file = createFile(WITH_IMPORT_FIXTURE);
        file.imports.add({ package: "@webiny/extensions", imports: ["Api"] });
        file.save();
        const content = read();
        expect(content).toContain("Infra");
        expect(content).toContain("Api");
        const count = (content.match(/from "@webiny\/extensions"/g) ?? []).length;
        expect(count).toBe(1);
    });

    it("supports aliased imports using { name: alias } syntax", () => {
        const file = createFile(FIXTURE);
        file.imports.add({
            package: "@webiny/extensions",
            imports: [{ Infra: "Infrastructure" }]
        });
        file.save();
        expect(read()).toContain("Infra as Infrastructure");
    });

    it("skips a duplicate and does not add the import a second time", () => {
        const file = createFile(WITH_IMPORT_FIXTURE);
        file.imports.add({ package: "@webiny/extensions", imports: ["Infra"] });
        file.save();
        const count = (read().match(/\bInfra\b/g) ?? []).length;
        expect(count).toBe(1);
    });

    it("warns when skipping a duplicate named import", () => {
        const file = createFile(WITH_IMPORT_FIXTURE);
        file.imports.add({ package: "@webiny/extensions", imports: ["Infra"] });
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("Infra"));
    });

    it("handles multiple imports in a single call", () => {
        const file = createFile(FIXTURE);
        file.imports.add({ package: "@webiny/extensions", imports: ["Infra", "Api"] });
        file.save();
        const content = read();
        expect(content).toContain("Infra");
        expect(content).toContain("Api");
        const count = (content.match(/from "@webiny\/extensions"/g) ?? []).length;
        expect(count).toBe(1);
    });

    it("handles a mix of plain and aliased imports in a single call", () => {
        const file = createFile(FIXTURE);
        file.imports.add({
            package: "@webiny/extensions",
            imports: ["Api", { Infra: "Infrastructure" }]
        });
        file.save();
        const content = read();
        expect(content).toContain("Api");
        expect(content).toContain("Infra as Infrastructure");
    });
});

// ── imports.remove ────────────────────────────────────────────────────────────────────

const WITH_TWO_IMPORTS_FIXTURE = `import { Infra, Api } from "@webiny/extensions";

export const Extensions = () => {
    return (
        <>
            <ProjectAws />
        </>
    );
};
`;

describe("WebinyConfigFile — imports.remove", () => {
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

    const createFile = (content: string): WebinyConfigFile => {
        fs.writeFileSync(filePath, content, "utf-8");
        return new WebinyConfigFile(filePath, logger);
    };

    const read = (): string => fs.readFileSync(filePath, "utf-8");

    it("removes the entire import declaration when no imports array is given", () => {
        const file = createFile(WITH_IMPORT_FIXTURE);
        file.imports.remove({ package: "@webiny/extensions" });
        file.save();
        expect(read()).not.toContain("@webiny/extensions");
    });

    it("is a no-op when the package is not imported", () => {
        const file = createFile(FIXTURE);
        file.imports.remove({ package: "@webiny/extensions" });
        file.save();
        expect(read()).toBe(FIXTURE);
    });

    it("removes only the specified named import, keeping the rest", () => {
        const file = createFile(WITH_TWO_IMPORTS_FIXTURE);
        file.imports.remove({ package: "@webiny/extensions", imports: ["Api"] });
        file.save();
        const content = read();
        expect(content).not.toContain("Api");
        expect(content).toContain("Infra");
        expect(content).toContain("@webiny/extensions");
    });

    it("removes multiple named imports in a single call", () => {
        const file = createFile(WITH_TWO_IMPORTS_FIXTURE);
        file.imports.remove({ package: "@webiny/extensions", imports: ["Infra", "Api"] });
        file.save();
        expect(read()).not.toContain("@webiny/extensions");
    });

    it("silently ignores a named import that is not present", () => {
        const file = createFile(WITH_IMPORT_FIXTURE);
        file.imports.remove({ package: "@webiny/extensions", imports: ["NonExistent"] });
        file.save();
        expect(read()).toContain("Infra");
        expect(logger.warn).not.toHaveBeenCalled();
    });

    it("removes the whole declaration when all named imports are removed", () => {
        const file = createFile(WITH_IMPORT_FIXTURE);
        file.imports.remove({ package: "@webiny/extensions", imports: ["Infra"] });
        file.save();
        expect(read()).not.toContain("@webiny/extensions");
    });

    it("removes only present names and ignores absent ones in the same call", () => {
        const file = createFile(WITH_TWO_IMPORTS_FIXTURE);
        file.imports.remove({ package: "@webiny/extensions", imports: ["Api", "NonExistent"] });
        file.save();
        const content = read();
        expect(content).not.toContain("Api");
        expect(content).toContain("Infra");
    });
});

// ── fixture with existing block element (for makeBuilder / structural-merge tests) ────

const FIXTURE_WITH_BLOCK = `export const Extensions = () => {
    return (
        <>
            <Infra.Env.IsProd>
                <ChildA />
                <ChildB />
            </Infra.Env.IsProd>
            <ProjectAws />
        </>
    );
};
`;

describe("WebinyConfigFile — jsx.insertBefore", () => {
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

    const createFile = (content = FIXTURE): WebinyConfigFile => {
        fs.writeFileSync(filePath, content, "utf-8");
        return new WebinyConfigFile(filePath, logger);
    };

    const read = (): string => fs.readFileSync(filePath, "utf-8");

    it("places element immediately before the ref (non-first child)", () => {
        const file = createFile();
        file.jsx.insertBefore("ProjectAws", "Infra.Foo");
        file.save();
        const content = read();
        expect(content).toContain("<Infra.Foo />");
        expect(content.indexOf("<Infra.ProductionEnvironments")).toBeLessThan(
            content.indexOf("<Infra.Foo />")
        );
        expect(content.indexOf("<Infra.Foo />")).toBeLessThan(content.indexOf("<ProjectAws />"));
    });

    it("places element before the first child when ref is the first child", () => {
        const file = createFile();
        file.jsx.insertBefore("Infra.ProductionEnvironments", "Infra.Foo");
        file.save();
        const content = read();
        expect(content).toContain("<Infra.Foo />");
        expect(content.indexOf("<Infra.Foo />")).toBeLessThan(
            content.indexOf("<Infra.ProductionEnvironments")
        );
    });

    it("warns and appends at end when ref not found", () => {
        const file = createFile();
        file.jsx.insertBefore("NonExistent", "Infra.Foo");
        file.save();
        const content = read();
        // Foo appended at end — after ProjectAws
        expect(content.indexOf("<ProjectAws />")).toBeLessThan(content.indexOf("<Infra.Foo />"));
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("<NonExistent>"));
    });

    it("warns and no-ops when tag already exists", () => {
        const file = createFile();
        file.jsx.insertBefore("ProjectAws", "Infra.ProductionEnvironments"); // already in fixture
        file.save();
        const content = read();
        const count = (content.match(/<Infra\.ProductionEnvironments/g) ?? []).length;
        expect(count).toBe(1);
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining("<Infra.ProductionEnvironments>")
        );
    });

    it("warns and no-ops when tag already exists even with children callback", () => {
        const file = createFile();
        file.jsx.insertBefore("ProjectAws", "Infra.ProductionEnvironments", {
            children: b => b.addChild("ShouldNotAppear")
        });
        file.save();
        expect(read()).not.toContain("<ShouldNotAppear");
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining("<Infra.ProductionEnvironments>")
        );
    });

    it("warns and no-ops (no merge) when tag is an existing block element", () => {
        const file = createFile(FIXTURE_WITH_BLOCK);
        file.jsx.insertBefore("ProjectAws", "Infra.Env.IsProd", {
            children: b => b.addChild("ShouldNotAppear")
        });
        file.save();
        const content = read();
        expect(content).not.toContain("<ShouldNotAppear");
        const count = (content.match(/<Infra\.Env\.IsProd>/g) ?? []).length;
        expect(count).toBe(1);
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("<Infra.Env.IsProd>"));
    });

    it("works inside a children callback on an existing container (makeBuilder path)", () => {
        const file = createFile(FIXTURE_WITH_BLOCK);
        file.jsx.addChild("Infra.Env.IsProd", {
            children: b => {
                b.insertBefore("ChildB", "NewChild");
            }
        });
        file.save();
        const content = read();
        expect(content).toContain("<NewChild />");
        expect(content.indexOf("<ChildA />")).toBeLessThan(content.indexOf("<NewChild />"));
        expect(content.indexOf("<NewChild />")).toBeLessThan(content.indexOf("<ChildB />"));
    });

    it("warns and inserts into empty fragment when ref not found", () => {
        const file = createFile(EMPTY_FIXTURE);
        file.jsx.insertBefore("NonExistent", "NewElement");
        file.save();
        expect(read()).toContain("<NewElement />");
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("<NonExistent>"));
    });

    it("inserts before the first child of a nested JsxElement container", () => {
        const file = createFile(FIXTURE_WITH_BLOCK);
        file.jsx.addChild("Infra.Env.IsProd", {
            children: b => b.insertBefore("ChildA", "NewFirst")
        });
        file.save();
        const content = read();
        expect(content).toContain("<NewFirst />");
        expect(content.indexOf("<NewFirst />")).toBeLessThan(content.indexOf("<ChildA />"));
    });
});

describe("WebinyConfigFile — jsx.insertAfter", () => {
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

    const createFile = (content = FIXTURE): WebinyConfigFile => {
        fs.writeFileSync(filePath, content, "utf-8");
        return new WebinyConfigFile(filePath, logger);
    };

    const read = (): string => fs.readFileSync(filePath, "utf-8");

    it("places element immediately after the ref", () => {
        const file = createFile();
        file.jsx.insertAfter("Infra.ProductionEnvironments", "Infra.Foo");
        file.save();
        const content = read();
        expect(content).toContain("<Infra.Foo />");
        expect(content.indexOf("<Infra.ProductionEnvironments")).toBeLessThan(
            content.indexOf("<Infra.Foo />")
        );
        expect(content.indexOf("<Infra.Foo />")).toBeLessThan(content.indexOf("<ProjectAws />"));
    });

    it("warns and appends at end when ref not found", () => {
        const file = createFile();
        file.jsx.insertAfter("NonExistent", "Infra.Foo");
        file.save();
        const content = read();
        expect(content.indexOf("<ProjectAws />")).toBeLessThan(content.indexOf("<Infra.Foo />"));
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("<NonExistent>"));
    });

    it("warns and no-ops when tag already exists", () => {
        const file = createFile();
        file.jsx.insertAfter("Infra.ProductionEnvironments", "ProjectAws"); // already in fixture
        file.save();
        const content = read();
        const count = (content.match(/<ProjectAws \/>/g) ?? []).length;
        expect(count).toBe(1);
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("<ProjectAws>"));
    });

    it("warns and no-ops when tag already exists even with children callback", () => {
        const file = createFile();
        file.jsx.insertAfter("Infra.ProductionEnvironments", "ProjectAws", {
            children: b => b.addChild("ShouldNotAppear")
        });
        file.save();
        expect(read()).not.toContain("<ShouldNotAppear");
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("<ProjectAws>"));
    });

    it("warns and no-ops (no merge) when tag is an existing block element", () => {
        const file = createFile(FIXTURE_WITH_BLOCK);
        file.jsx.insertAfter("ProjectAws", "Infra.Env.IsProd", {
            children: b => b.addChild("ShouldNotAppear")
        });
        file.save();
        const content = read();
        expect(content).not.toContain("<ShouldNotAppear");
        const count = (content.match(/<Infra\.Env\.IsProd>/g) ?? []).length;
        expect(count).toBe(1);
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("<Infra.Env.IsProd>"));
    });

    it("works inside a children callback on an existing container (makeBuilder path)", () => {
        const file = createFile(FIXTURE_WITH_BLOCK);
        file.jsx.addChild("Infra.Env.IsProd", {
            children: b => {
                b.insertAfter("ChildA", "NewChild");
            }
        });
        file.save();
        const content = read();
        expect(content).toContain("<NewChild />");
        expect(content.indexOf("<ChildA />")).toBeLessThan(content.indexOf("<NewChild />"));
        expect(content.indexOf("<NewChild />")).toBeLessThan(content.indexOf("<ChildB />"));
    });
});
