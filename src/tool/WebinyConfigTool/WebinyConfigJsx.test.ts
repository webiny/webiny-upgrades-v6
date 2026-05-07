import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Project, ts } from "ts-morph";
import { WebinyConfigJsx } from "./WebinyConfigJsx.js";
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

describe("WebinyConfigJsx — addChild", () => {
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

    const createJsx = (content: string, log = logger) => {
        fs.writeFileSync(filePath, content, "utf-8");
        const project = new Project({
            compilerOptions: { jsx: ts.JsxEmit.ReactJSX },
            skipAddingFilesFromTsConfig: true
        });
        const sourceFile = project.addSourceFileAtPath(filePath);
        return {
            jsx: new WebinyConfigJsx(sourceFile, log),
            save: () => sourceFile.saveSync(),
            read: () => fs.readFileSync(filePath, "utf-8")
        };
    };

    // ── basic insert ───────────────────────────────────────────────────────────

    it("inserts a self-closing element after the last fragment child", () => {
        const { jsx, save, read } = createJsx(FIXTURE);
        jsx.addChild("Infra.Foo");
        save();
        expect(read()).toContain("<Infra.Foo />");
    });

    it("inserts after the last existing child (not before it)", () => {
        const { jsx, save, read } = createJsx(FIXTURE);
        jsx.addChild("Infra.Foo");
        save();
        const content = read();
        expect(content.indexOf("<ProjectAws />")).toBeLessThan(content.indexOf("<Infra.Foo />"));
    });

    it("renders props as JSX expression attributes", () => {
        const { jsx, save, read } = createJsx(FIXTURE);
        jsx.addChild("Infra.Foo", { props: { bar: '"hello"', n: "42" } });
        save();
        expect(read()).toContain('<Infra.Foo bar={"hello"} n={42} />');
    });

    it("renders a comment on the line above the element", () => {
        const { jsx, save, read } = createJsx(FIXTURE);
        jsx.addChild("Infra.Foo", { comment: "My comment" });
        save();
        const content = read();
        expect(content).toContain("{/* My comment */}");
        expect(content.indexOf("{/* My comment */}")).toBeLessThan(
            content.indexOf("<Infra.Foo />")
        );
    });

    it("uses the same indentation as existing fragment children", () => {
        const { jsx, save, read } = createJsx(FIXTURE);
        jsx.addChild("Infra.Foo");
        save();
        expect(read()).toMatch(/^            <Infra\.Foo \/>/m);
    });

    // ── insert with children ───────────────────────────────────────────────────

    it("inserts a block element with children", () => {
        const { jsx, save, read } = createJsx(FIXTURE);
        jsx.addChild("Infra.Bar", {
            children: b => {
                b.addChild("Infra.Baz");
            }
        });
        save();
        const content = read();
        expect(content).toContain("<Infra.Bar>");
        expect(content).toContain("<Infra.Baz />");
        expect(content).toContain("</Infra.Bar>");
    });

    it("indents nested children one level deeper than the parent", () => {
        const { jsx, save, read } = createJsx(FIXTURE);
        jsx.addChild("Infra.Bar", {
            children: b => {
                b.addChild("Infra.Baz");
            }
        });
        save();
        // fragment children in the fixture are at 12 spaces → nested child at 16 spaces
        expect(read()).toMatch(/^                <Infra\.Baz \/>/m);
    });

    // ── duplicate detection ────────────────────────────────────────────────────

    it("does not insert a duplicate element on a second addChild call", () => {
        const { jsx, save, read } = createJsx(FIXTURE);
        jsx.addChild("Infra.Foo");
        jsx.addChild("Infra.Foo");
        save();
        const count = (read().match(/<Infra\.Foo \/>/g) ?? []).length;
        expect(count).toBe(1);
    });

    it("warns when attempting to add an element that already exists", () => {
        const { jsx } = createJsx(FIXTURE);
        jsx.addChild("ProjectAws"); // already in FIXTURE
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("<ProjectAws>"));
    });

    it("does not warn when the element does not yet exist", () => {
        const { jsx } = createJsx(FIXTURE);
        jsx.addChild("Infra.NewThing");
        expect(logger.warn).not.toHaveBeenCalled();
    });

    // ── structural merge ───────────────────────────────────────────────────────

    it("merges children into existing parent instead of duplicating outer element", () => {
        const { jsx, save, read } = createJsx(FIXTURE);
        jsx.addChild("Infra.Env.IsProd", {
            children: b => {
                b.addChild("Infra.Encryption", { props: { passphrase: 'process.env.X || ""' } });
            }
        });
        save();

        const { jsx: jsx2, save: save2 } = createJsx(read());
        jsx2.addChild("Infra.Env.IsProd", {
            children: b => {
                b.addChild("Infra.NewChild");
            }
        });
        save2();

        const content = read();
        expect((content.match(/<Infra\.Env\.IsProd>/g) ?? []).length).toBe(1);
        expect(content).toContain("<Infra.Encryption");
        expect(content).toContain("<Infra.NewChild />");
    });

    it("warns when a nested child already exists during structural merge", () => {
        const { jsx, save, read } = createJsx(FIXTURE);
        jsx.addChild("Infra.Env.IsProd", {
            children: b => {
                b.addChild("Infra.Encryption", { props: { passphrase: 'process.env.X || ""' } });
            }
        });
        save();

        const logger2 = createMockLogger();
        const { jsx: jsx2 } = createJsx(read(), logger2);
        jsx2.addChild("Infra.Env.IsProd", {
            children: b => {
                b.addChild("Infra.Encryption"); // already exists
            }
        });
        expect(logger2.warn).toHaveBeenCalledWith(expect.stringContaining("<Infra.Encryption>"));
    });

    it("handles 3 levels of nesting on initial insert", () => {
        const { jsx, save, read } = createJsx(FIXTURE);
        jsx.addChild("Level1", {
            children: b1 => {
                b1.addChild("Level2", {
                    children: b2 => {
                        b2.addChild("Level3");
                    }
                });
            }
        });
        save();
        const content = read();
        expect(content).toContain("<Level1>");
        expect(content).toContain("<Level2>");
        expect(content).toContain("<Level3 />");
        expect(content).toContain("</Level2>");
        expect(content).toContain("</Level1>");
    });

    it("structural merge at 3 levels deep adds the missing leaf without duplicating parents", () => {
        const { jsx, save, read } = createJsx(FIXTURE);
        jsx.addChild("Level1", {
            children: b1 => {
                b1.addChild("Level2", {
                    children: b2 => {
                        b2.addChild("Level3a");
                    }
                });
            }
        });
        save();

        const { jsx: jsx2, save: save2 } = createJsx(read());
        jsx2.addChild("Level1", {
            children: b1 => {
                b1.addChild("Level2", {
                    children: b2 => {
                        b2.addChild("Level3b");
                    }
                });
            }
        });
        save2();

        const content = read();
        expect((content.match(/<Level1>/g) ?? []).length).toBe(1);
        expect((content.match(/<Level2>/g) ?? []).length).toBe(1);
        expect(content).toContain("<Level3a />");
        expect(content).toContain("<Level3b />");
    });

    // ── missing fragment ───────────────────────────────────────────────────────

    it("does nothing and warns when file has no JSX fragment", () => {
        const { jsx, save, read } = createJsx("export const x = 1;");
        jsx.addChild("Infra.Foo");
        save();
        expect(read()).toBe("export const x = 1;");
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("No JSX fragment"));
    });

    // ── empty fragment ─────────────────────────────────────────────────────────

    it("inserts an element into an empty fragment", () => {
        const { jsx, save, read } = createJsx(EMPTY_FIXTURE);
        jsx.addChild("NewElement");
        save();
        expect(read()).toContain("<NewElement />");
    });

    it("inserts a child into an empty block element via structural merge", () => {
        const { jsx, save, read } = createJsx(EMPTY_BLOCK_FIXTURE);
        jsx.addChild("Level1", { children: b => b.addChild("NewChild") });
        save();
        expect(read()).toContain("<NewChild />");
    });

    it("skips non-element JSX nodes when searching for duplicates", () => {
        const { jsx, save, read } = createJsx(JSX_EXPRESSION_FIXTURE);
        jsx.addChild("NewElement");
        save();
        expect(read()).toContain("<NewElement />");
    });
});

describe("WebinyConfigJsx — insertBefore", () => {
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

    const createJsx = (content = FIXTURE, log = logger) => {
        fs.writeFileSync(filePath, content, "utf-8");
        const project = new Project({
            compilerOptions: { jsx: ts.JsxEmit.ReactJSX },
            skipAddingFilesFromTsConfig: true
        });
        const sourceFile = project.addSourceFileAtPath(filePath);
        return {
            jsx: new WebinyConfigJsx(sourceFile, log),
            save: () => sourceFile.saveSync(),
            read: () => fs.readFileSync(filePath, "utf-8")
        };
    };

    it("places element immediately before the ref (non-first child)", () => {
        const { jsx, save, read } = createJsx();
        jsx.insertBefore("ProjectAws", "Infra.Foo");
        save();
        const content = read();
        expect(content).toContain("<Infra.Foo />");
        expect(content.indexOf("<Infra.ProductionEnvironments")).toBeLessThan(
            content.indexOf("<Infra.Foo />")
        );
        expect(content.indexOf("<Infra.Foo />")).toBeLessThan(content.indexOf("<ProjectAws />"));
    });

    it("places element before the first child when ref is the first child", () => {
        const { jsx, save, read } = createJsx();
        jsx.insertBefore("Infra.ProductionEnvironments", "Infra.Foo");
        save();
        const content = read();
        expect(content).toContain("<Infra.Foo />");
        expect(content.indexOf("<Infra.Foo />")).toBeLessThan(
            content.indexOf("<Infra.ProductionEnvironments")
        );
    });

    it("warns and appends at end when ref not found", () => {
        const { jsx, save, read } = createJsx();
        jsx.insertBefore("NonExistent", "Infra.Foo");
        save();
        const content = read();
        expect(content.indexOf("<ProjectAws />")).toBeLessThan(content.indexOf("<Infra.Foo />"));
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("<NonExistent>"));
    });

    it("warns and no-ops when tag already exists", () => {
        const { jsx, save, read } = createJsx();
        jsx.insertBefore("ProjectAws", "Infra.ProductionEnvironments"); // already in fixture
        save();
        const content = read();
        const count = (content.match(/<Infra\.ProductionEnvironments/g) ?? []).length;
        expect(count).toBe(1);
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining("<Infra.ProductionEnvironments>")
        );
    });

    it("warns and no-ops when tag already exists even with children callback", () => {
        const { jsx, save, read } = createJsx();
        jsx.insertBefore("ProjectAws", "Infra.ProductionEnvironments", {
            children: b => b.addChild("ShouldNotAppear")
        });
        save();
        expect(read()).not.toContain("<ShouldNotAppear");
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining("<Infra.ProductionEnvironments>")
        );
    });

    it("warns and no-ops (no merge) when tag is an existing block element", () => {
        const { jsx, save, read } = createJsx(FIXTURE_WITH_BLOCK);
        jsx.insertBefore("ProjectAws", "Infra.Env.IsProd", {
            children: b => b.addChild("ShouldNotAppear")
        });
        save();
        const content = read();
        expect(content).not.toContain("<ShouldNotAppear");
        const count = (content.match(/<Infra\.Env\.IsProd>/g) ?? []).length;
        expect(count).toBe(1);
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("<Infra.Env.IsProd>"));
    });

    it("works inside a children callback on an existing container (makeBuilder path)", () => {
        const { jsx, save, read } = createJsx(FIXTURE_WITH_BLOCK);
        jsx.addChild("Infra.Env.IsProd", {
            children: b => {
                b.insertBefore("ChildB", "NewChild");
            }
        });
        save();
        const content = read();
        expect(content).toContain("<NewChild />");
        expect(content.indexOf("<ChildA />")).toBeLessThan(content.indexOf("<NewChild />"));
        expect(content.indexOf("<NewChild />")).toBeLessThan(content.indexOf("<ChildB />"));
    });

    it("warns and inserts into empty fragment when ref not found", () => {
        const { jsx, save, read } = createJsx(EMPTY_FIXTURE);
        jsx.insertBefore("NonExistent", "NewElement");
        save();
        expect(read()).toContain("<NewElement />");
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("<NonExistent>"));
    });

    it("inserts before the first child of a nested JsxElement container", () => {
        const { jsx, save, read } = createJsx(FIXTURE_WITH_BLOCK);
        jsx.addChild("Infra.Env.IsProd", {
            children: b => b.insertBefore("ChildA", "NewFirst")
        });
        save();
        const content = read();
        expect(content).toContain("<NewFirst />");
        expect(content.indexOf("<NewFirst />")).toBeLessThan(content.indexOf("<ChildA />"));
    });
});

describe("WebinyConfigJsx — insertAfter", () => {
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

    const createJsx = (content = FIXTURE, log = logger) => {
        fs.writeFileSync(filePath, content, "utf-8");
        const project = new Project({
            compilerOptions: { jsx: ts.JsxEmit.ReactJSX },
            skipAddingFilesFromTsConfig: true
        });
        const sourceFile = project.addSourceFileAtPath(filePath);
        return {
            jsx: new WebinyConfigJsx(sourceFile, log),
            save: () => sourceFile.saveSync(),
            read: () => fs.readFileSync(filePath, "utf-8")
        };
    };

    it("places element immediately after the ref", () => {
        const { jsx, save, read } = createJsx();
        jsx.insertAfter("Infra.ProductionEnvironments", "Infra.Foo");
        save();
        const content = read();
        expect(content).toContain("<Infra.Foo />");
        expect(content.indexOf("<Infra.ProductionEnvironments")).toBeLessThan(
            content.indexOf("<Infra.Foo />")
        );
        expect(content.indexOf("<Infra.Foo />")).toBeLessThan(content.indexOf("<ProjectAws />"));
    });

    it("warns and appends at end when ref not found", () => {
        const { jsx, save, read } = createJsx();
        jsx.insertAfter("NonExistent", "Infra.Foo");
        save();
        const content = read();
        expect(content.indexOf("<ProjectAws />")).toBeLessThan(content.indexOf("<Infra.Foo />"));
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("<NonExistent>"));
    });

    it("warns and no-ops when tag already exists", () => {
        const { jsx, save, read } = createJsx();
        jsx.insertAfter("Infra.ProductionEnvironments", "ProjectAws"); // already in fixture
        save();
        const content = read();
        const count = (content.match(/<ProjectAws \/>/g) ?? []).length;
        expect(count).toBe(1);
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("<ProjectAws>"));
    });

    it("warns and no-ops when tag already exists even with children callback", () => {
        const { jsx, save, read } = createJsx();
        jsx.insertAfter("Infra.ProductionEnvironments", "ProjectAws", {
            children: b => b.addChild("ShouldNotAppear")
        });
        save();
        expect(read()).not.toContain("<ShouldNotAppear");
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("<ProjectAws>"));
    });

    it("warns and no-ops (no merge) when tag is an existing block element", () => {
        const { jsx, save, read } = createJsx(FIXTURE_WITH_BLOCK);
        jsx.insertAfter("ProjectAws", "Infra.Env.IsProd", {
            children: b => b.addChild("ShouldNotAppear")
        });
        save();
        const content = read();
        expect(content).not.toContain("<ShouldNotAppear");
        const count = (content.match(/<Infra\.Env\.IsProd>/g) ?? []).length;
        expect(count).toBe(1);
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("<Infra.Env.IsProd>"));
    });

    it("works inside a children callback on an existing container (makeBuilder path)", () => {
        const { jsx, save, read } = createJsx(FIXTURE_WITH_BLOCK);
        jsx.addChild("Infra.Env.IsProd", {
            children: b => {
                b.insertAfter("ChildA", "NewChild");
            }
        });
        save();
        const content = read();
        expect(content).toContain("<NewChild />");
        expect(content.indexOf("<ChildA />")).toBeLessThan(content.indexOf("<NewChild />"));
        expect(content.indexOf("<NewChild />")).toBeLessThan(content.indexOf("<ChildB />"));
    });
});
