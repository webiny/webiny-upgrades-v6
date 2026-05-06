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

describe("WebinyConfigFile", () => {
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
        file.addChild("Infra.Foo");
        file.save();
        expect(read()).toContain("<Infra.Foo />");
    });

    it("inserts after the last existing child (not before it)", () => {
        const file = createFile();
        file.addChild("Infra.Foo");
        file.save();
        const content = read();
        expect(content.indexOf("<ProjectAws />")).toBeLessThan(content.indexOf("<Infra.Foo />"));
    });

    it("renders props as JSX expression attributes", () => {
        const file = createFile();
        file.addChild("Infra.Foo", { props: { bar: '"hello"', n: "42" } });
        file.save();
        expect(read()).toContain('<Infra.Foo bar={"hello"} n={42} />');
    });

    it("renders a comment on the line above the element", () => {
        const file = createFile();
        file.addChild("Infra.Foo", { comment: "My comment" });
        file.save();
        const content = read();
        expect(content).toContain("{/* My comment */}");
        expect(content.indexOf("{/* My comment */}")).toBeLessThan(
            content.indexOf("<Infra.Foo />")
        );
    });

    it("uses the same indentation as existing fragment children", () => {
        const file = createFile();
        file.addChild("Infra.Foo");
        file.save();
        expect(read()).toMatch(/^            <Infra\.Foo \/>/m);
    });

    // ── insert with children ───────────────────────────────────────────────────

    it("inserts a block element with children", () => {
        const file = createFile();
        file.addChild("Infra.Bar", {
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
        file.addChild("Infra.Bar", {
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
        file.addChild("Infra.Foo");
        file.addChild("Infra.Foo");
        file.save();
        const count = (read().match(/<Infra\.Foo \/>/g) ?? []).length;
        expect(count).toBe(1);
    });

    it("warns when attempting to add an element that already exists", () => {
        const file = createFile();
        file.addChild("ProjectAws"); // already in FIXTURE
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("<ProjectAws>"));
    });

    it("does not warn when the element does not yet exist", () => {
        const file = createFile();
        file.addChild("Infra.NewThing");
        expect(logger.warn).not.toHaveBeenCalled();
    });

    // ── structural merge ───────────────────────────────────────────────────────

    it("merges children into existing parent instead of duplicating outer element", () => {
        const file = createFile();
        file.addChild("Infra.Env.IsProd", {
            children: b => {
                b.addChild("Infra.Encryption", { props: { passphrase: 'process.env.X || ""' } });
            }
        });
        file.save();

        const file2 = new WebinyConfigFile(filePath, logger);
        file2.addChild("Infra.Env.IsProd", {
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
        file.addChild("Infra.Env.IsProd", {
            children: b => {
                b.addChild("Infra.Encryption", { props: { passphrase: 'process.env.X || ""' } });
            }
        });
        file.save();

        const logger2 = createMockLogger();
        const file2 = new WebinyConfigFile(filePath, logger2);
        file2.addChild("Infra.Env.IsProd", {
            children: b => {
                b.addChild("Infra.Encryption"); // already exists
            }
        });
        expect(logger2.warn).toHaveBeenCalledWith(expect.stringContaining("<Infra.Encryption>"));
    });

    it("handles 3 levels of nesting on initial insert", () => {
        const file = createFile();
        file.addChild("Level1", {
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
        file.addChild("Level1", {
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
        file2.addChild("Level1", {
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
        file.addChild("Infra.Foo");
        file.save();
        expect(read()).toBe("export const x = 1;");
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("No JSX fragment"));
    });

    // ── save ───────────────────────────────────────────────────────────────────

    it("save() writes mutations to disk", () => {
        const file = createFile();
        file.addChild("Infra.NewThing");
        expect(read()).not.toContain("<Infra.NewThing />");
        file.save();
        expect(read()).toContain("<Infra.NewThing />");
    });
});
