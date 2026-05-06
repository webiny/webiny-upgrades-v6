# insertBefore / insertAfter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `WebinyConfigFile` with `insertBefore` and `insertAfter` methods that position a new JSX element relative to a named sibling, warn and fall back to append if the ref is not found, and split text-building logic into a pure `JsxTextBuilder` class for independent testability.

**Architecture:** Extract `buildText`/`buildPropsStr` from `WebinyConfigFile` into a stateless `JsxTextBuilder` class (no ts-morph dependency) as a pure refactor first; then add `insertBefore`/`insertAfter` public methods backed by an `InsertPosition` discriminated union threaded into `addToContainer`; update `abstraction.ts` and `makeBuilder` to expose the new methods at every nesting level.

**Tech Stack:** ts-morph (AST manipulation), vitest (testing), TypeScript

**Approved spec:** `docs/superpowers/specs/2026-05-06-insert-before-after-design.md`

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/tool/WebinyConfigTool/JsxTextBuilder.ts` | Pure text construction — no ts-morph; `buildElement(tag, opts, indent): string` |
| Create | `src/tool/WebinyConfigTool/JsxTextBuilder.test.ts` | Pure unit tests for `JsxTextBuilder` (no tmpdir) |
| Modify | `src/tool/WebinyConfigTool/WebinyConfigFile.ts` | Remove `buildText`/`buildPropsStr`; add `InsertPosition`, `insertBefore`, `insertAfter`, `inferIndentFromNode`, `insertAtPosition`; update `addToContainer` + `makeBuilder` |
| Modify | `src/tool/WebinyConfigTool/WebinyConfigFile.test.ts` | Add `insertBefore` / `insertAfter` test cases |
| Modify | `src/tool/WebinyConfigTool/abstraction.ts` | Add `insertBefore` / `insertAfter` to `IWebinyConfigBuilder` |
| Modify | `AGENTS.md` | Update `### WebinyConfigFile API` section |
| Modify | `.claude/skills/write-upgrade/SKILL.md` | Update `### WebinyConfigFile API` section |

---

## Task 1: Extract JsxTextBuilder (pure refactor)

**Files:**
- Create: `src/tool/WebinyConfigTool/JsxTextBuilder.ts`
- Create: `src/tool/WebinyConfigTool/JsxTextBuilder.test.ts`
- Modify: `src/tool/WebinyConfigTool/WebinyConfigFile.ts`

Goal: move `buildText` + `buildPropsStr` into a new stateless class, delegate from `WebinyConfigFile`. All existing tests must remain green after every step.

- [ ] **Step 1.1: Write failing tests for JsxTextBuilder**

Create `src/tool/WebinyConfigTool/JsxTextBuilder.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { JsxTextBuilder } from "./JsxTextBuilder.js";

describe("JsxTextBuilder", () => {
    const builder = new JsxTextBuilder();
    const indent = "            "; // 12 spaces — matches fixture indent

    it("renders a self-closing element with no options", () => {
        const result = builder.buildElement("Infra.Foo", {}, indent);
        expect(result).toBe(`${indent}<Infra.Foo />`);
    });

    it("renders a comment on the line above the element", () => {
        const result = builder.buildElement("Infra.Foo", { comment: "My comment" }, indent);
        expect(result).toBe(`${indent}{/* My comment */}\n${indent}<Infra.Foo />`);
    });

    it("renders props as {expression} attributes", () => {
        const result = builder.buildElement(
            "Infra.Foo",
            { props: { passphrase: 'process.env.X || ""', n: "42" } },
            indent
        );
        expect(result).toBe(
            `${indent}<Infra.Foo passphrase={process.env.X || ""} n={42} />`
        );
    });

    it("renders a block element with nested addChild children", () => {
        const result = builder.buildElement(
            "Infra.Bar",
            {
                children: b => {
                    b.addChild("Infra.Baz");
                }
            },
            indent
        );
        const childIndent = indent + "    ";
        expect(result).toBe(
            `${indent}<Infra.Bar>\n${childIndent}<Infra.Baz />\n${indent}</Infra.Bar>`
        );
    });

    it("indents nested children one level deeper than the parent", () => {
        const result = builder.buildElement(
            "Parent",
            { children: b => b.addChild("Child") },
            "    " // 4-space indent
        );
        // child should be at 8 spaces
        expect(result).toContain("        <Child />");
    });
});
```

- [ ] **Step 1.2: Run tests — confirm they fail**

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && yarn test src/tool/WebinyConfigTool/JsxTextBuilder.test.ts 2>&1 | tail -20
```

Expected: error — `Cannot find module './JsxTextBuilder.js'`

- [ ] **Step 1.3: Create JsxTextBuilder.ts**

Create `src/tool/WebinyConfigTool/JsxTextBuilder.ts`:

```ts
import type { WebinyConfigTool } from "./abstraction.js";

export class JsxTextBuilder {
    public buildElement(tag: string, options: WebinyConfigTool.ChildOptions, indent: string): string {
        const lines: string[] = [];
        const propsStr = this.buildPropsStr(options.props);

        if (options.comment) {
            lines.push(`${indent}{/* ${options.comment} */}`);
        }

        if (options.children) {
            const childLines: string[] = [];
            const childIndent = indent + "    ";
            options.children({
                addChild: (childTag: string, childOpts: WebinyConfigTool.ChildOptions = {}) => {
                    childLines.push(this.buildElement(childTag, childOpts, childIndent));
                }
            });
            lines.push(`${indent}<${tag}${propsStr}>`);
            lines.push(...childLines);
            lines.push(`${indent}</${tag}>`);
        } else {
            lines.push(`${indent}<${tag}${propsStr} />`);
        }

        return lines.join("\n");
    }

    private buildPropsStr(props?: Record<string, string>): string {
        if (!props || Object.keys(props).length === 0) {
            return "";
        }
        return " " + Object.entries(props).map(([k, v]) => `${k}={${v}}`).join(" ");
    }
}
```

- [ ] **Step 1.4: Run JsxTextBuilder tests — confirm they pass**

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && yarn test src/tool/WebinyConfigTool/JsxTextBuilder.test.ts 2>&1 | tail -15
```

Expected: all 5 tests pass.

- [ ] **Step 1.5: Update WebinyConfigFile.ts to delegate to JsxTextBuilder**

Replace the file with the delegating version. Key changes:
- Add `import { JsxTextBuilder } from "./JsxTextBuilder.js";`
- Add `private readonly jsxTextBuilder = new JsxTextBuilder();`
- Replace `this.buildText(...)` calls with `this.jsxTextBuilder.buildElement(...)`
- Remove the `buildText` and `buildPropsStr` private methods

Full updated `src/tool/WebinyConfigTool/WebinyConfigFile.ts`:

```ts
import { Project, SyntaxKind, ts } from "ts-morph";
import type { SourceFile, JsxElement, JsxSelfClosingElement, JsxFragment, Node } from "ts-morph";
import type { Logger } from "../../base/Logger/index.js";
import type { WebinyConfigTool } from "./abstraction.js";
import { JsxTextBuilder } from "./JsxTextBuilder.js";

export class WebinyConfigFile implements WebinyConfigTool.File {
    private readonly sourceFile: SourceFile;
    private readonly jsxTextBuilder = new JsxTextBuilder();

    public constructor(
        filePath: string,
        private readonly logger: Logger.Interface
    ) {
        const project = new Project({
            compilerOptions: { jsx: ts.JsxEmit.ReactJSX },
            skipAddingFilesFromTsConfig: true
        });
        this.sourceFile = project.addSourceFileAtPath(filePath);
    }

    public addChild(tag: string, options: WebinyConfigTool.ChildOptions = {}): void {
        this.addToContainer([], tag, options);
    }

    public save(): void {
        this.sourceFile.saveSync();
    }

    private addToContainer(
        containerPath: string[],
        tag: string,
        options: WebinyConfigTool.ChildOptions
    ): void {
        const fragment = this.sourceFile.getFirstDescendantByKind(SyntaxKind.JsxFragment);
        if (!fragment) {
            this.logger.warn("No JSX fragment found in webiny.config.tsx, skipping");
            return;
        }
        const container = this.resolveContainer(containerPath);
        if (!container) {
            const missing =
                containerPath.length > 0
                    ? containerPath[containerPath.length - 1]
                    : "root fragment";
            this.logger.warn(`<${missing}> not found in webiny.config.tsx, cannot add children`);
            return;
        }

        const realChildren = this.getRealChildren(container);
        const existing = this.findChild(realChildren, tag);

        if (existing) {
            if (options.children && existing.getKind() === SyntaxKind.JsxElement) {
                options.children(this.makeBuilder([...containerPath, tag]));
                return;
            }
            this.logger.warn(`<${tag}> already exists, skipping`);
            return;
        }

        // Re-query fresh refs after any prior insertions in this same callback batch.
        const freshContainer = this.resolveContainer(containerPath);
        if (!freshContainer) {
            this.logger.warn(`Container became unavailable during insertion, skipping`);
            return;
        }
        const freshChildren = this.getRealChildren(freshContainer);
        const indent = this.inferIndent(freshChildren, freshContainer);
        const text = this.jsxTextBuilder.buildElement(tag, options, indent);
        const lastChild = freshChildren[freshChildren.length - 1];

        if (lastChild) {
            this.sourceFile.insertText(lastChild.getEnd(), "\n" + text);
        } else {
            this.insertIntoEmpty(freshContainer, text, indent);
        }
    }

    private resolveContainer(containerPath: string[]): JsxFragment | JsxElement | null {
        const fragment = this.sourceFile.getFirstDescendantByKind(SyntaxKind.JsxFragment);
        if (!fragment) {
            return null;
        }
        let current: JsxFragment | JsxElement = fragment;
        for (const tag of containerPath) {
            const child = this.findChild(this.getRealChildren(current), tag);
            if (!child || child.getKind() !== SyntaxKind.JsxElement) {
                return null;
            }
            current = child as JsxElement;
        }
        return current;
    }

    private makeBuilder(containerPath: string[]): WebinyConfigTool.Builder {
        return {
            addChild: (tag: string, opts: WebinyConfigTool.ChildOptions = {}) => {
                this.addToContainer(containerPath, tag, opts);
            }
        };
    }

    private getRealChildren(container: JsxFragment | JsxElement): Node[] {
        return container.getJsxChildren().filter(c => c.getKind() !== SyntaxKind.JsxText);
    }

    private findChild(children: Node[], tag: string): Node | undefined {
        return children.find(c => {
            if (c.getKind() === SyntaxKind.JsxElement) {
                return (c as JsxElement).getOpeningElement().getTagNameNode().getText() === tag;
            }
            if (c.getKind() === SyntaxKind.JsxSelfClosingElement) {
                return (c as JsxSelfClosingElement).getTagNameNode().getText() === tag;
            }
            return false;
        });
    }

    private inferIndent(realChildren: Node[], container: JsxFragment | JsxElement): string {
        if (realChildren.length > 0) {
            const pos = realChildren[0].getStart();
            const src = this.sourceFile.getFullText();
            const lineStart = src.lastIndexOf("\n", pos) + 1;
            return " ".repeat(pos - lineStart);
        }
        if (container.getKind() === SyntaxKind.JsxFragment) {
            return "            "; // 12-space fallback for empty fragments
        }
        const pos = container.getStart();
        const src = this.sourceFile.getFullText();
        const lineStart = src.lastIndexOf("\n", pos) + 1;
        return " ".repeat(pos - lineStart + 4);
    }

    private insertIntoEmpty(
        container: JsxFragment | JsxElement,
        text: string,
        indent: string
    ): void {
        const parentIndent = " ".repeat(Math.max(0, indent.length - 4));
        let closingPos: number;

        if (container.getKind() === SyntaxKind.JsxFragment) {
            closingPos = (container as JsxFragment).getClosingFragment().getStart();
        } else {
            closingPos = (container as JsxElement).getClosingElement().getStart();
        }

        this.sourceFile.insertText(closingPos, "\n" + text + "\n" + parentIndent);
    }
}
```

- [ ] **Step 1.6: Run all tests — confirm still green**

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && yarn test 2>&1 | tail -20
```

Expected: all tests pass (pure refactor — no behaviour changes).

- [ ] **Step 1.7: Commit**

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && git add src/tool/WebinyConfigTool/JsxTextBuilder.ts src/tool/WebinyConfigTool/JsxTextBuilder.test.ts src/tool/WebinyConfigTool/WebinyConfigFile.ts && git commit -m "refactor: extract JsxTextBuilder from WebinyConfigFile for independent testability"
```

---

## Task 2: Add insertBefore / insertAfter

**Files:**
- Modify: `src/tool/WebinyConfigTool/abstraction.ts`
- Modify: `src/tool/WebinyConfigTool/JsxTextBuilder.ts`
- Modify: `src/tool/WebinyConfigTool/JsxTextBuilder.test.ts`
- Modify: `src/tool/WebinyConfigTool/WebinyConfigFile.ts`
- Modify: `src/tool/WebinyConfigTool/WebinyConfigFile.test.ts`

- [ ] **Step 2.1: Write failing tests in WebinyConfigFile.test.ts**

Add a second fixture and two describe blocks to the end of `src/tool/WebinyConfigTool/WebinyConfigFile.test.ts`. Append after the closing `});` of the existing `describe("WebinyConfigFile", ...)` block (the file currently ends at line 248):

```ts
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

describe("WebinyConfigFile — insertBefore", () => {
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
        file.insertBefore("ProjectAws", "Infra.Foo");
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
        file.insertBefore("Infra.ProductionEnvironments", "Infra.Foo");
        file.save();
        const content = read();
        expect(content).toContain("<Infra.Foo />");
        expect(content.indexOf("<Infra.Foo />")).toBeLessThan(
            content.indexOf("<Infra.ProductionEnvironments")
        );
    });

    it("warns and appends at end when ref not found", () => {
        const file = createFile();
        file.insertBefore("NonExistent", "Infra.Foo");
        file.save();
        const content = read();
        // Foo appended at end — after ProjectAws
        expect(content.indexOf("<ProjectAws />")).toBeLessThan(content.indexOf("<Infra.Foo />"));
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("<NonExistent>"));
    });

    it("warns and no-ops when tag already exists", () => {
        const file = createFile();
        file.insertBefore("ProjectAws", "Infra.ProductionEnvironments"); // already in fixture
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
        file.insertBefore("ProjectAws", "Infra.ProductionEnvironments", {
            children: b => b.addChild("ShouldNotAppear")
        });
        file.save();
        expect(read()).not.toContain("<ShouldNotAppear");
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining("<Infra.ProductionEnvironments>")
        );
    });

    it("works inside a children callback on an existing container (makeBuilder path)", () => {
        const file = createFile(FIXTURE_WITH_BLOCK);
        file.addChild("Infra.Env.IsProd", {
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
});

describe("WebinyConfigFile — insertAfter", () => {
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
        file.insertAfter("Infra.ProductionEnvironments", "Infra.Foo");
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
        file.insertAfter("NonExistent", "Infra.Foo");
        file.save();
        const content = read();
        expect(content.indexOf("<ProjectAws />")).toBeLessThan(content.indexOf("<Infra.Foo />"));
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("<NonExistent>"));
    });

    it("warns and no-ops when tag already exists", () => {
        const file = createFile();
        file.insertAfter("Infra.ProductionEnvironments", "ProjectAws"); // already in fixture
        file.save();
        const content = read();
        const count = (content.match(/<ProjectAws \/>/g) ?? []).length;
        expect(count).toBe(1);
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("<ProjectAws>"));
    });

    it("warns and no-ops when tag already exists even with children callback", () => {
        const file = createFile();
        file.insertAfter("Infra.ProductionEnvironments", "ProjectAws", {
            children: b => b.addChild("ShouldNotAppear")
        });
        file.save();
        expect(read()).not.toContain("<ShouldNotAppear");
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("<ProjectAws>"));
    });

    it("works inside a children callback on an existing container (makeBuilder path)", () => {
        const file = createFile(FIXTURE_WITH_BLOCK);
        file.addChild("Infra.Env.IsProd", {
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
```

- [ ] **Step 2.2: Run tests — confirm new tests fail**

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && yarn test src/tool/WebinyConfigTool/WebinyConfigFile.test.ts 2>&1 | tail -20
```

Expected: compile error — `Property 'insertBefore' does not exist on type 'WebinyConfigFile'`

- [ ] **Step 2.3: Update abstraction.ts — add insertBefore / insertAfter to IWebinyConfigBuilder**

Replace `src/tool/WebinyConfigTool/abstraction.ts` with:

```ts
import { createAbstraction } from "../../utils/createAbstraction.js";

interface AddChildOptions {
    comment?: string;
    props?: Record<string, string>;
    children?: (builder: IWebinyConfigBuilder) => void;
}

interface IWebinyConfigBuilder {
    addChild(tag: string, options?: AddChildOptions): void;
    insertBefore(ref: string, tag: string, options?: AddChildOptions): void;
    insertAfter(ref: string, tag: string, options?: AddChildOptions): void;
}

interface IWebinyConfigFile extends IWebinyConfigBuilder {
    save(): void;
}

interface IWebinyConfigTool {
    read(): IWebinyConfigFile;
    save(file: IWebinyConfigFile): void;
}

export const WebinyConfigTool = createAbstraction<IWebinyConfigTool>("Tool/WebinyConfigTool");

export namespace WebinyConfigTool {
    export type Interface = IWebinyConfigTool;
    export type File = IWebinyConfigFile;
    export type Builder = IWebinyConfigBuilder;
    export type ChildOptions = AddChildOptions;
}
```

- [ ] **Step 2.4: Update JsxTextBuilder.ts — add insertBefore / insertAfter to synthetic builder**

The synthetic builder passed to `options.children(...)` must now satisfy the full `WebinyConfigTool.Builder` interface. `insertBefore` and `insertAfter` on the synthetic builder simply append (no existing siblings when building new text, no warning emitted):

Replace `src/tool/WebinyConfigTool/JsxTextBuilder.ts` with:

```ts
import type { WebinyConfigTool } from "./abstraction.js";

export class JsxTextBuilder {
    public buildElement(tag: string, options: WebinyConfigTool.ChildOptions, indent: string): string {
        const lines: string[] = [];
        const propsStr = this.buildPropsStr(options.props);

        if (options.comment) {
            lines.push(`${indent}{/* ${options.comment} */}`);
        }

        if (options.children) {
            const childLines: string[] = [];
            const childIndent = indent + "    ";
            const syntheticBuilder: WebinyConfigTool.Builder = {
                addChild: (childTag: string, childOpts: WebinyConfigTool.ChildOptions = {}) => {
                    childLines.push(this.buildElement(childTag, childOpts, childIndent));
                },
                insertBefore: (_ref: string, childTag: string, childOpts: WebinyConfigTool.ChildOptions = {}) => {
                    childLines.push(this.buildElement(childTag, childOpts, childIndent));
                },
                insertAfter: (_ref: string, childTag: string, childOpts: WebinyConfigTool.ChildOptions = {}) => {
                    childLines.push(this.buildElement(childTag, childOpts, childIndent));
                }
            };
            options.children(syntheticBuilder);
            lines.push(`${indent}<${tag}${propsStr}>`);
            lines.push(...childLines);
            lines.push(`${indent}</${tag}>`);
        } else {
            lines.push(`${indent}<${tag}${propsStr} />`);
        }

        return lines.join("\n");
    }

    private buildPropsStr(props?: Record<string, string>): string {
        if (!props || Object.keys(props).length === 0) {
            return "";
        }
        return " " + Object.entries(props).map(([k, v]) => `${k}={${v}}`).join(" ");
    }
}
```

- [ ] **Step 2.5: Add insertBefore / insertAfter tests to JsxTextBuilder.test.ts**

Append these two tests inside the `describe("JsxTextBuilder", ...)` block (before its closing `});`):

```ts
    it("insertBefore on synthetic builder appends the child without throwing", () => {
        const result = builder.buildElement(
            "Parent",
            {
                children: b => {
                    b.insertBefore("NonExistent", "ChildA");
                    b.insertBefore("ChildA", "ChildB");
                }
            },
            indent
        );
        expect(result).toContain("<ChildA />");
        expect(result).toContain("<ChildB />");
    });

    it("insertAfter on synthetic builder appends the child without throwing", () => {
        const result = builder.buildElement(
            "Parent",
            {
                children: b => {
                    b.insertAfter("NonExistent", "ChildA");
                    b.insertAfter("ChildA", "ChildB");
                }
            },
            indent
        );
        expect(result).toContain("<ChildA />");
        expect(result).toContain("<ChildB />");
    });
```

- [ ] **Step 2.6: Run JsxTextBuilder tests — confirm all pass**

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && yarn test src/tool/WebinyConfigTool/JsxTextBuilder.test.ts 2>&1 | tail -15
```

Expected: all 7 tests pass.

- [ ] **Step 2.7: Update WebinyConfigFile.ts — add InsertPosition, helpers, public methods, and updated makeBuilder**

Replace `src/tool/WebinyConfigTool/WebinyConfigFile.ts` with the full updated version:

```ts
import { Project, SyntaxKind, ts } from "ts-morph";
import type { SourceFile, JsxElement, JsxSelfClosingElement, JsxFragment, Node } from "ts-morph";
import type { Logger } from "../../base/Logger/index.js";
import type { WebinyConfigTool } from "./abstraction.js";
import { JsxTextBuilder } from "./JsxTextBuilder.js";

type InsertPosition =
    | { mode: "append" }
    | { mode: "before"; ref: string }
    | { mode: "after"; ref: string };

export class WebinyConfigFile implements WebinyConfigTool.File {
    private readonly sourceFile: SourceFile;
    private readonly jsxTextBuilder = new JsxTextBuilder();

    public constructor(
        filePath: string,
        private readonly logger: Logger.Interface
    ) {
        const project = new Project({
            compilerOptions: { jsx: ts.JsxEmit.ReactJSX },
            skipAddingFilesFromTsConfig: true
        });
        this.sourceFile = project.addSourceFileAtPath(filePath);
    }

    public addChild(tag: string, options: WebinyConfigTool.ChildOptions = {}): void {
        this.addToContainer([], tag, options);
    }

    public insertBefore(ref: string, tag: string, options: WebinyConfigTool.ChildOptions = {}): void {
        this.addToContainer([], tag, options, { mode: "before", ref });
    }

    public insertAfter(ref: string, tag: string, options: WebinyConfigTool.ChildOptions = {}): void {
        this.addToContainer([], tag, options, { mode: "after", ref });
    }

    public save(): void {
        this.sourceFile.saveSync();
    }

    private addToContainer(
        containerPath: string[],
        tag: string,
        options: WebinyConfigTool.ChildOptions,
        position: InsertPosition = { mode: "append" }
    ): void {
        const fragment = this.sourceFile.getFirstDescendantByKind(SyntaxKind.JsxFragment);
        if (!fragment) {
            this.logger.warn("No JSX fragment found in webiny.config.tsx, skipping");
            return;
        }
        const container = this.resolveContainer(containerPath);
        if (!container) {
            const missing =
                containerPath.length > 0
                    ? containerPath[containerPath.length - 1]
                    : "root fragment";
            this.logger.warn(`<${missing}> not found in webiny.config.tsx, cannot add children`);
            return;
        }

        const realChildren = this.getRealChildren(container);
        const existing = this.findChild(realChildren, tag);

        if (existing) {
            if (
                position.mode === "append" &&
                options.children &&
                existing.getKind() === SyntaxKind.JsxElement
            ) {
                // Structural merge — only for addChild, never for insertBefore/insertAfter
                options.children(this.makeBuilder([...containerPath, tag]));
                return;
            }
            this.logger.warn(`<${tag}> already exists, skipping`);
            return;
        }

        // Re-query fresh refs after any prior insertions in this same callback batch.
        const freshContainer = this.resolveContainer(containerPath);
        if (!freshContainer) {
            this.logger.warn(`Container became unavailable during insertion, skipping`);
            return;
        }
        const freshChildren = this.getRealChildren(freshContainer);

        if (position.mode === "append") {
            const indent = this.inferIndent(freshChildren, freshContainer);
            const text = this.jsxTextBuilder.buildElement(tag, options, indent);
            const lastChild = freshChildren[freshChildren.length - 1];
            if (lastChild) {
                this.sourceFile.insertText(lastChild.getEnd(), "\n" + text);
            } else {
                this.insertIntoEmpty(freshContainer, text, indent);
            }
            return;
        }

        // before / after mode
        const refChild = this.findChild(freshChildren, position.ref);
        if (!refChild) {
            this.logger.warn(`<${position.ref}> not found, inserting <${tag}> at end`);
            const indent = this.inferIndent(freshChildren, freshContainer);
            const text = this.jsxTextBuilder.buildElement(tag, options, indent);
            const lastChild = freshChildren[freshChildren.length - 1];
            if (lastChild) {
                this.sourceFile.insertText(lastChild.getEnd(), "\n" + text);
            } else {
                this.insertIntoEmpty(freshContainer, text, indent);
            }
            return;
        }

        const indent = this.inferIndentFromNode(refChild);
        const text = this.jsxTextBuilder.buildElement(tag, options, indent);
        this.insertAtPosition(position, refChild, freshChildren, freshContainer, text);
    }

    private insertAtPosition(
        position: { mode: "before" | "after"; ref: string },
        refChild: Node,
        realChildren: Node[],
        container: JsxFragment | JsxElement,
        text: string
    ): void {
        if (position.mode === "after") {
            this.sourceFile.insertText(refChild.getEnd(), "\n" + text);
            return;
        }

        const idx = realChildren.indexOf(refChild);
        if (idx === 0) {
            // Insert after the container's opening tag
            const openingEnd =
                container.getKind() === SyntaxKind.JsxFragment
                    ? (container as JsxFragment).getOpeningFragment().getEnd()
                    : (container as JsxElement).getOpeningElement().getEnd();
            this.sourceFile.insertText(openingEnd, "\n" + text);
        } else {
            // Insert after the previous sibling — same pattern as insertAfter
            this.sourceFile.insertText(realChildren[idx - 1].getEnd(), "\n" + text);
        }
    }

    private resolveContainer(containerPath: string[]): JsxFragment | JsxElement | null {
        const fragment = this.sourceFile.getFirstDescendantByKind(SyntaxKind.JsxFragment);
        if (!fragment) {
            return null;
        }
        let current: JsxFragment | JsxElement = fragment;
        for (const tag of containerPath) {
            const child = this.findChild(this.getRealChildren(current), tag);
            if (!child || child.getKind() !== SyntaxKind.JsxElement) {
                return null;
            }
            current = child as JsxElement;
        }
        return current;
    }

    private makeBuilder(containerPath: string[]): WebinyConfigTool.Builder {
        return {
            addChild: (tag: string, opts: WebinyConfigTool.ChildOptions = {}) => {
                this.addToContainer(containerPath, tag, opts);
            },
            insertBefore: (ref: string, tag: string, opts: WebinyConfigTool.ChildOptions = {}) => {
                this.addToContainer(containerPath, tag, opts, { mode: "before", ref });
            },
            insertAfter: (ref: string, tag: string, opts: WebinyConfigTool.ChildOptions = {}) => {
                this.addToContainer(containerPath, tag, opts, { mode: "after", ref });
            }
        };
    }

    private getRealChildren(container: JsxFragment | JsxElement): Node[] {
        return container.getJsxChildren().filter(c => c.getKind() !== SyntaxKind.JsxText);
    }

    private findChild(children: Node[], tag: string): Node | undefined {
        return children.find(c => {
            if (c.getKind() === SyntaxKind.JsxElement) {
                return (c as JsxElement).getOpeningElement().getTagNameNode().getText() === tag;
            }
            if (c.getKind() === SyntaxKind.JsxSelfClosingElement) {
                return (c as JsxSelfClosingElement).getTagNameNode().getText() === tag;
            }
            return false;
        });
    }

    private inferIndent(realChildren: Node[], container: JsxFragment | JsxElement): string {
        if (realChildren.length > 0) {
            return this.inferIndentFromNode(realChildren[0]);
        }
        if (container.getKind() === SyntaxKind.JsxFragment) {
            return "            "; // 12-space fallback for empty fragments
        }
        const pos = container.getStart();
        const src = this.sourceFile.getFullText();
        const lineStart = src.lastIndexOf("\n", pos) + 1;
        return " ".repeat(pos - lineStart + 4);
    }

    private inferIndentFromNode(node: Node): string {
        const pos = node.getStart();
        const src = this.sourceFile.getFullText();
        const lineStart = src.lastIndexOf("\n", pos) + 1;
        return " ".repeat(pos - lineStart);
    }

    private insertIntoEmpty(
        container: JsxFragment | JsxElement,
        text: string,
        indent: string
    ): void {
        const parentIndent = " ".repeat(Math.max(0, indent.length - 4));
        let closingPos: number;

        if (container.getKind() === SyntaxKind.JsxFragment) {
            closingPos = (container as JsxFragment).getClosingFragment().getStart();
        } else {
            closingPos = (container as JsxElement).getClosingElement().getStart();
        }

        this.sourceFile.insertText(closingPos, "\n" + text + "\n" + parentIndent);
    }
}
```

- [ ] **Step 2.8: Run all tests — confirm everything passes**

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && yarn test 2>&1 | tail -25
```

Expected: all tests pass, including the 11 new tests across the two new describe blocks.

- [ ] **Step 2.9: Commit**

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && git add src/tool/WebinyConfigTool/abstraction.ts src/tool/WebinyConfigTool/JsxTextBuilder.ts src/tool/WebinyConfigTool/JsxTextBuilder.test.ts src/tool/WebinyConfigTool/WebinyConfigFile.ts src/tool/WebinyConfigTool/WebinyConfigFile.test.ts && git commit -m "feat: add insertBefore / insertAfter to WebinyConfigFile and Builder interface"
```

---

## Task 3: Docs + full verification

**Files:**
- Modify: `AGENTS.md`
- Modify: `.claude/skills/write-upgrade/SKILL.md`

- [ ] **Step 3.1: Update AGENTS.md — WebinyConfigFile API section**

Locate the `### WebinyConfigFile API` section in `AGENTS.md` (currently around line 94). Replace the entire section (from `### WebinyConfigFile API` down to and including the closing code block before `### PackageJsonFile API`) with:

````markdown
### WebinyConfigFile API

The object returned by `WebinyConfigTool.read()`:

```ts
file.addChild(tag: string, options?: ChildOptions): void
file.insertBefore(ref: string, tag: string, options?: ChildOptions): void
file.insertAfter(ref: string, tag: string, options?: ChildOptions): void
file.save(): void

interface ChildOptions {
    comment?: string;                       // renders as {/* comment */} above the element
    props?: Record<string, string>;         // expression syntax: { passphrase: 'process.env.X || ""' }
    children?: (builder: Builder) => void;  // nested children callback
}
```

`addChild` behaviour:
- **Not found** → inserts self-closing or block element after the last JSX fragment child
- **Found, no `children` callback** → logs a warning and skips (duplicates are never added)
- **Found, `children` callback provided** → structural merge: recurses into the existing element so each nested `addChild` applies the same logic one level deeper

`insertBefore(ref, tag, options)` / `insertAfter(ref, tag, options)` behaviour:
- **`ref` not found** → warns (`<ref> not found, inserting <tag> at end`) and falls back to append
- **`tag` already exists** → warns and no-ops — **no** structural merge even if `options.children` is provided; use `addChild` for structural merge
- **Normal path** → inserts `tag` immediately before / after the first occurrence of `ref` among direct children; indent is inferred from `ref`'s column offset
- Both methods are available at every nesting level via the `Builder` passed to `addChild`'s `children` callback

Example — top-level positioning:
```ts
const webinyConfig = this.webinyConfigTool.read();
webinyConfig.insertBefore("ProjectAws", "Infra.Env.IsProd", {
    comment: "Encryption MUST always be configured for production environments.",
    children: (children) => {
        children.addChild("Infra.Encryption", {
            props: { passphrase: 'process.env.WEBINY_ENCRYPTION_PASSPHRASE || ""' }
        });
    }
});
this.webinyConfigTool.save(webinyConfig);
```

Example — nested positioning via `addChild` structural merge:
```ts
webinyConfig.addChild("Infra.Env.IsProd", {
    children: (b) => {
        b.insertAfter("Infra.Encryption", "Infra.NewFeature");
    }
});
```
````

- [ ] **Step 3.2: Update SKILL.md — WebinyConfigFile API section**

Locate the `### WebinyConfigFile API` section in `.claude/skills/write-upgrade/SKILL.md` (currently around line 94). Replace the entire section (from `### WebinyConfigFile API` to the closing code block before `### PackageJsonFile API`) with:

````markdown
### WebinyConfigFile API

The object returned by `WebinyConfigTool.read()`:

```ts
file.addChild(tag: string, options?: ChildOptions): void
file.insertBefore(ref: string, tag: string, options?: ChildOptions): void
file.insertAfter(ref: string, tag: string, options?: ChildOptions): void
file.save(): void

interface ChildOptions {
    comment?: string;                       // renders as {/* comment */} above the element
    props?: Record<string, string>;         // expression syntax: { passphrase: 'process.env.X || ""' }
    children?: (builder: Builder) => void;  // nested children callback
}
```

`addChild` behaviour:
- **Not found** → inserts after the last JSX fragment child (self-closing if no `children`, block element if `children` provided)
- **Found, no `children` callback** → logs a warning and skips (never creates duplicates)
- **Found, `children` callback provided** → structural merge: recurses into the existing element

`insertBefore(ref, tag, options)` / `insertAfter(ref, tag, options)` behaviour:
- **`ref` not found** → warns and falls back to append at end
- **`tag` already exists** → warns and no-ops — **no** structural merge, even if `options.children` provided
- **Normal path** → inserts `tag` immediately before/after the first occurrence of `ref`; indent is inferred from `ref`'s column offset
- Available at every nesting level via the `Builder` passed to a `children` callback
````

- [ ] **Step 3.3: Run full post-task verification chain**

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && yarn lint:fix && yarn && yarn build && yarn test && yarn adio:check 2>&1 | tail -30
```

Expected: all steps pass. If any step fails, fix the issue and re-run the full chain.

- [ ] **Step 3.4: Commit**

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && git add AGENTS.md .claude/skills/write-upgrade/SKILL.md && git commit -m "docs: update WebinyConfigFile API docs with insertBefore / insertAfter"
```
