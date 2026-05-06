# WebinyConfigTool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a DI-registered `WebinyConfigTool` that reads and mutates `webiny.config.tsx` via ts-morph, with duplicate-safe `addChild` and structural merge, then refactor the 6.3.0 upgrade to use it.

**Architecture:** `WebinyConfigFile` (standalone ts-morph wrapper) + `WebinyConfigToolImpl` (thin DI wrapper). `addChild` re-queries the AST from the source file root after every `insertText` call via a `containerPath: string[]` — this avoids stale node references that would occur if `JsxElement` refs were held across mutations. Structural merge is recursive: when the target element already exists and a `children` callback is supplied, the callback's builder is scoped to `[...containerPath, tag]`.

**Tech Stack:** ts-morph (already installed), `@webiny/di`, vitest

---

## File Map

| Action | Path |
|--------|------|
| Create | `src/tool/WebinyConfigTool/abstraction.ts` |
| Create | `src/tool/WebinyConfigTool/WebinyConfigFile.ts` |
| Create | `src/tool/WebinyConfigTool/WebinyConfigFile.test.ts` |
| Create | `src/tool/WebinyConfigTool/WebinyConfigTool.ts` |
| Create | `src/tool/WebinyConfigTool/WebinyConfigTool.test.ts` |
| Create | `src/tool/WebinyConfigTool/feature.ts` |
| Create | `src/tool/WebinyConfigTool/index.ts` |
| Modify | `src/container.ts` — register `WebinyConfigToolFeature` |
| Modify | `src/upgrades/6.3.0/Upgrade.ts` — use `WebinyConfigTool`, remove `addInfraEncryption` |
| Modify | `src/upgrades/6.3.0/Upgrade.test.ts` — replace `addInfraEncryption` mock |
| Modify | `src/__tests__/utils/createUpgradeIntegrationHarness.ts` — register `WebinyConfigToolImpl` |
| Delete | `src/upgrades/6.3.0/addInfraEncryption.ts` |
| Delete | `src/upgrades/6.3.0/addInfraEncryption.test.ts` |

---

## Task 1: `WebinyConfigFile` — tests and implementation

**Files:**
- Create: `src/tool/WebinyConfigTool/WebinyConfigFile.ts`
- Create: `src/tool/WebinyConfigTool/WebinyConfigFile.test.ts`

> **Note on stale node references:** ts-morph invalidates `Node` references after every `insertText` call. To avoid bugs when multiple children are added in sequence, the implementation re-queries the parent container from the source file root on every `addToContainer` call using a `containerPath: string[]` (list of tag names from the fragment root to the current parent). This means `resolveContainer([])` returns the fragment, `resolveContainer(["Infra.Env.IsProd"])` traverses into it.

- [ ] **Step 1.1 — Write `WebinyConfigFile.test.ts`**

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
        expect(content.indexOf("{/* My comment */}")).toBeLessThan(content.indexOf("<Infra.Foo />"));
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
            children: (b) => {
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
            children: (b) => {
                b.addChild("Infra.Baz");
            }
        });
        file.save();
        // fragment children at 12 spaces → nested child at 16 spaces
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
            children: (b) => {
                b.addChild("Infra.Encryption", { props: { passphrase: 'process.env.X || ""' } });
            }
        });
        file.save();

        const file2 = new WebinyConfigFile(filePath, logger);
        file2.addChild("Infra.Env.IsProd", {
            children: (b) => {
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
            children: (b) => {
                b.addChild("Infra.Encryption", { props: { passphrase: 'process.env.X || ""' } });
            }
        });
        file.save();

        const logger2 = createMockLogger();
        const file2 = new WebinyConfigFile(filePath, logger2);
        file2.addChild("Infra.Env.IsProd", {
            children: (b) => {
                b.addChild("Infra.Encryption"); // already exists
            }
        });
        expect(logger2.warn).toHaveBeenCalledWith(expect.stringContaining("<Infra.Encryption>"));
    });

    it("handles 3 levels of nesting on initial insert", () => {
        const file = createFile();
        file.addChild("Level1", {
            children: (b1) => {
                b1.addChild("Level2", {
                    children: (b2) => {
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
            children: (b1) => {
                b1.addChild("Level2", {
                    children: (b2) => {
                        b2.addChild("Level3a");
                    }
                });
            }
        });
        file.save();

        const file2 = new WebinyConfigFile(filePath, logger);
        file2.addChild("Level1", {
            children: (b1) => {
                b1.addChild("Level2", {
                    children: (b2) => {
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
```

- [ ] **Step 1.2 — Run the tests to confirm they all fail**

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && yarn test src/tool/WebinyConfigTool/WebinyConfigFile.test.ts 2>&1 | tail -20
```

Expected: all tests fail with "Cannot find module" or similar.

- [ ] **Step 1.3 — Write `WebinyConfigFile.ts`**

```typescript
import { Project, SyntaxKind, ts } from "ts-morph";
import type { SourceFile, JsxElement, JsxSelfClosingElement, JsxFragment, Node } from "ts-morph";
import type { Logger } from "../../base/Logger/index.js";
import type { IWebinyConfigFile, IWebinyConfigBuilder, AddChildOptions } from "./abstraction.js";

export class WebinyConfigFile implements IWebinyConfigFile {
    private readonly sourceFile: SourceFile;

    public constructor(filePath: string, private readonly logger: Logger.Interface) {
        const project = new Project({
            compilerOptions: { jsx: ts.JsxEmit.ReactJSX },
            skipAddingFilesFromTsConfig: true
        });
        this.sourceFile = project.addSourceFileAtPath(filePath);
    }

    public addChild(tag: string, options: AddChildOptions = {}): void {
        this.addToContainer([], tag, options);
    }

    public save(): void {
        this.sourceFile.saveSync();
    }

    private addToContainer(containerPath: string[], tag: string, options: AddChildOptions): void {
        const container = this.resolveContainer(containerPath);
        if (!container) {
            this.logger.warn("No JSX fragment found in webiny.config.tsx, skipping");
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
        const freshContainer = this.resolveContainer(containerPath)!;
        const freshChildren = this.getRealChildren(freshContainer);
        const indent = this.inferIndent(freshChildren, freshContainer);
        const text = this.buildText(tag, options, indent);
        const lastChild = freshChildren[freshChildren.length - 1];

        if (lastChild) {
            this.sourceFile.insertText(lastChild.getEnd(), "\n" + text);
        } else {
            this.insertIntoEmpty(freshContainer, text, indent);
        }
    }

    private resolveContainer(containerPath: string[]): JsxFragment | JsxElement | null {
        const fragment = this.sourceFile.getFirstDescendantByKind(SyntaxKind.JsxFragment);
        if (!fragment) return null;
        let current: JsxFragment | JsxElement = fragment;
        for (const tag of containerPath) {
            const child = this.findChild(this.getRealChildren(current), tag);
            if (!child || child.getKind() !== SyntaxKind.JsxElement) return null;
            current = child as JsxElement;
        }
        return current;
    }

    private makeBuilder(containerPath: string[]): IWebinyConfigBuilder {
        return {
            addChild: (tag: string, opts: AddChildOptions = {}) => {
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

    private buildText(tag: string, options: AddChildOptions, indent: string): string {
        const lines: string[] = [];
        const propsStr = this.buildPropsStr(options.props);

        if (options.comment) {
            lines.push(`${indent}{/* ${options.comment} */}`);
        }

        if (options.children) {
            const childLines: string[] = [];
            const childIndent = indent + "    ";
            options.children({
                addChild: (childTag: string, childOpts: AddChildOptions = {}) => {
                    childLines.push(this.buildText(childTag, childOpts, childIndent));
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
        if (!props || Object.keys(props).length === 0) return "";
        return " " + Object.entries(props).map(([k, v]) => `${k}={${v}}`).join(" ");
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

> **Abstraction stub needed:** `WebinyConfigFile.ts` imports from `./abstraction.js`, which doesn't exist yet. Create a minimal `abstraction.ts` now so types resolve:

```typescript
// src/tool/WebinyConfigTool/abstraction.ts  (minimal — expanded in Task 2)
import { createAbstraction } from "../../utils/createAbstraction.js";

export interface AddChildOptions {
    comment?: string;
    props?: Record<string, string>;
    children?: (builder: IWebinyConfigBuilder) => void;
}

export interface IWebinyConfigBuilder {
    addChild(tag: string, options?: AddChildOptions): void;
}

export interface IWebinyConfigFile extends IWebinyConfigBuilder {
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

- [ ] **Step 1.4 — Run the tests and confirm they pass**

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && yarn test src/tool/WebinyConfigTool/WebinyConfigFile.test.ts 2>&1 | tail -30
```

Expected: all tests pass. Fix any failures before continuing.

- [ ] **Step 1.5 — Commit**

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && git add src/tool/WebinyConfigTool/ && git commit -m "feat: add WebinyConfigFile with addChild and structural merge"
```

---

## Task 2: `WebinyConfigTool` — DI wrapper, feature, index, tests

**Files:**
- Modify: `src/tool/WebinyConfigTool/abstraction.ts` (already created in Task 1 as the final version)
- Create: `src/tool/WebinyConfigTool/WebinyConfigTool.ts`
- Create: `src/tool/WebinyConfigTool/WebinyConfigTool.test.ts`
- Create: `src/tool/WebinyConfigTool/feature.ts`
- Create: `src/tool/WebinyConfigTool/index.ts`

- [ ] **Step 2.1 — Write `WebinyConfigTool.test.ts`**

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Container } from "@webiny/di";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WebinyConfigTool } from "./WebinyConfigTool.js";
import { WebinyConfigTool as WebinyConfigToolAbstraction } from "./abstraction.js";
import { Context } from "../../base/Context/index.js";
import { Logger } from "../../base/Logger/index.js";
import { createMockLogger } from "../../__tests__/utils/mockLogger.js";

const createContainer = (cwd: string) => {
    const container = new Container();
    container.registerInstance(Context, {
        cwd,
        registry: "",
        inputVersion: "0.0.0",
        targetVersion: {} as never,
        installedVersion: {} as never,
        currentVersion: {} as never,
        setCurrentVersion: vi.fn(),
        resolve: (...segments: string[]) => path.join(cwd, ...segments)
    });
    container.registerInstance(Logger, createMockLogger());
    container.register(WebinyConfigTool);
    return container;
};

describe("WebinyConfigTool", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "webiny-tool-test-"));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true });
    });

    it("read() returns a file object when webiny.config.tsx exists", () => {
        fs.writeFileSync(path.join(tmpDir, "webiny.config.tsx"), "export const x = 1;");
        const tool = createContainer(tmpDir).resolve(WebinyConfigToolAbstraction);
        const file = tool.read();
        expect(typeof file.addChild).toBe("function");
        expect(typeof file.save).toBe("function");
    });

    it("read() throws when webiny.config.tsx does not exist", () => {
        const tool = createContainer(tmpDir).resolve(WebinyConfigToolAbstraction);
        expect(() => tool.read()).toThrow("webiny.config.tsx not found");
    });

    it("save() calls file.save()", () => {
        const mockFile = { addChild: vi.fn(), save: vi.fn() };
        const tool = createContainer(tmpDir).resolve(WebinyConfigToolAbstraction);
        tool.save(mockFile);
        expect(mockFile.save).toHaveBeenCalledOnce();
    });
});
```

- [ ] **Step 2.2 — Run the tests to confirm they fail**

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && yarn test src/tool/WebinyConfigTool/WebinyConfigTool.test.ts 2>&1 | tail -15
```

Expected: all tests fail with "Cannot find module" or similar.

- [ ] **Step 2.3 — Write `WebinyConfigTool.ts`**

```typescript
import { WebinyConfigTool as WebinyConfigToolAbstraction } from "./abstraction.js";
import { WebinyConfigFile } from "./WebinyConfigFile.js";
import { Context } from "../../base/Context/index.js";
import { Logger } from "../../base/Logger/index.js";
import fs from "node:fs";

class WebinyConfigToolImpl implements WebinyConfigToolAbstraction.Interface {
    public constructor(
        private readonly context: Context.Interface,
        private readonly logger: Logger.Interface
    ) {}

    public read(): WebinyConfigToolAbstraction.File {
        const filePath = this.context.resolve("webiny.config.tsx");
        if (!fs.existsSync(filePath)) {
            throw new Error(`webiny.config.tsx not found at: ${filePath}`);
        }
        return new WebinyConfigFile(filePath, this.logger);
    }

    public save(file: WebinyConfigToolAbstraction.File): void {
        file.save();
    }
}

export const WebinyConfigTool = WebinyConfigToolAbstraction.createImplementation({
    implementation: WebinyConfigToolImpl,
    dependencies: [Context, Logger]
});
```

- [ ] **Step 2.4 — Write `feature.ts`**

```typescript
import { createFeature } from "../../utils/createFeature.js";
import { WebinyConfigTool } from "./WebinyConfigTool.js";

export const WebinyConfigToolFeature = createFeature({
    name: "Tool/WebinyConfigTool",
    register(container) {
        container.register(WebinyConfigTool);
    }
});
```

- [ ] **Step 2.5 — Write `index.ts`**

```typescript
export { WebinyConfigTool } from "./abstraction.js";
export { WebinyConfigToolFeature } from "./feature.js";
```

- [ ] **Step 2.6 — Run the tests and confirm they pass**

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && yarn test src/tool/WebinyConfigTool/WebinyConfigTool.test.ts 2>&1 | tail -20
```

Expected: all 3 tests pass.

- [ ] **Step 2.7 — Run all WebinyConfigTool tests together**

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && yarn test src/tool/WebinyConfigTool/ 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 2.8 — Commit**

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && git add src/tool/WebinyConfigTool/ && git commit -m "feat: add WebinyConfigTool DI wrapper with feature and index"
```

---

## Task 3: Register `WebinyConfigTool` in the container

**Files:**
- Modify: `src/container.ts`

- [ ] **Step 3.1 — Add import and register in `src/container.ts`**

After the existing `PackageJsonToolFeature` import, add:

```typescript
import { WebinyConfigToolFeature } from "./tool/WebinyConfigTool/index.js";
```

In the tools section of `createContainer` (after `PackageJsonToolFeature.register(container);`), add:

```typescript
WebinyConfigToolFeature.register(container);
```

- [ ] **Step 3.2 — Run the type check**

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && yarn build 2>&1 | tail -20
```

Expected: no type errors.

- [ ] **Step 3.3 — Commit**

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && git add src/container.ts && git commit -m "feat: register WebinyConfigTool in container"
```

---

## Task 4: Refactor 6.3.0 upgrade to use `WebinyConfigTool`

**Files:**
- Modify: `src/upgrades/6.3.0/Upgrade.ts`
- Modify: `src/upgrades/6.3.0/Upgrade.test.ts`
- Modify: `src/__tests__/utils/createUpgradeIntegrationHarness.ts`
- Delete: `src/upgrades/6.3.0/addInfraEncryption.ts`
- Delete: `src/upgrades/6.3.0/addInfraEncryption.test.ts`

- [ ] **Step 4.1 — Replace `src/upgrades/6.3.0/Upgrade.ts`**

Full new content:

```typescript
import { Upgrade as UpgradeAbstraction } from "../../base/Upgrade/index.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";
import { WebinyConfigTool } from "../../tool/WebinyConfigTool/index.js";
import { PackageManagerService } from "../../service/PackageManager/index.js";
import { Version } from "../../base/Version/index.js";

class UpgradeImpl implements UpgradeAbstraction.Interface {
    public readonly version = Version.create("6.3.0");

    public constructor(
        private readonly packageJsonTool: PackageJsonTool.Interface,
        private readonly webinyConfigTool: WebinyConfigTool.Interface,
        private readonly packageManagerService: PackageManagerService.Interface
    ) {}

    public async canHandle({
        targetVersion,
        currentVersion
    }: UpgradeAbstraction.Params): Promise<boolean> {
        return this.version.between(currentVersion, targetVersion);
    }

    public async execute(): Promise<void> {
        const packageJson = this.packageJsonTool.loadOrThrow();
        packageJson.setDevDependency("typescript", "6.0.3");
        this.packageJsonTool.save(packageJson);

        const webinyConfig = this.webinyConfigTool.read();
        webinyConfig.addChild("Infra.Env.IsProd", {
            comment: "Encryption MUST always be configured for production environments.",
            children: (children) => {
                children.addChild("Infra.Encryption", {
                    props: { passphrase: 'process.env.WEBINY_ENCRYPTION_PASSPHRASE || ""' }
                });
            }
        });
        this.webinyConfigTool.save(webinyConfig);

        if (this.packageManagerService.name() === "yarn") {
            await this.packageManagerService.update("4.14.1");
        }
    }
}

export const Upgrade = UpgradeAbstraction.createImplementation({
    implementation: UpgradeImpl,
    dependencies: [PackageJsonTool, WebinyConfigTool, PackageManagerService]
});
```

> **Note:** `Context` is no longer a dependency — `WebinyConfigTool` resolves the path internally via its own `Context` injection.

- [ ] **Step 4.2 — Replace `src/upgrades/6.3.0/Upgrade.test.ts`**

Full new content:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Container } from "@webiny/di";
import { Upgrade as Upgrade630 } from "./Upgrade.js";
import { Upgrade } from "../../base/Upgrade/abstraction.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";
import { WebinyConfigTool } from "../../tool/WebinyConfigTool/index.js";
import { PackageManagerService } from "../../service/PackageManager/index.js";
import { PackageJsonLoadError } from "../../service/PackageJson/index.js";
import { createMockPackageJsonFile } from "../../__tests__/utils/mockPackageJsonFile.js";
import { registerUpgradeDeps } from "../../__tests__/utils/mockUpgradeDeps.js";
import { Version } from "../../base/Version/index.js";
import type { PackageJsonFile } from "../../service/PackageJson/abstraction.js";
import type { PackageManagerName } from "../../service/PackageManager/detect.js";

const v = (version: string) => Version.create(version);

const params = (target: string, current: string) => ({
    targetVersion: v(target),
    currentVersion: v(current)
});

const createContainer = (
    file: PackageJsonFile.Interface | null = createMockPackageJsonFile(),
    pmName: PackageManagerName = "yarn"
) => {
    const container = new Container();
    registerUpgradeDeps(container, file);
    container.registerInstance(PackageManagerService, {
        install: vi.fn(),
        version: vi.fn(),
        name: vi.fn().mockReturnValue(pmName),
        update: vi.fn().mockResolvedValue(undefined)
    });
    const mockWebinyConfigFile = { addChild: vi.fn(), save: vi.fn() };
    container.registerInstance(WebinyConfigTool, {
        read: vi.fn().mockReturnValue(mockWebinyConfigFile),
        save: vi.fn()
    });
    container.register(Upgrade630);
    return container;
};

describe("Upgrade 6.3.0 - canHandle", () => {
    let upgrade: Upgrade.Interface;

    beforeEach(() => {
        vi.clearAllMocks();
        upgrade = createContainer().resolve(Upgrade);
    });

    it("returns true when current is below 6.3.0 and target is 6.3.0", async () => {
        expect(await upgrade.canHandle(params("6.3.0", "6.2.0"))).toBe(true);
    });

    it("returns true when target is above 6.3.0 and current is below 6.3.0", async () => {
        expect(await upgrade.canHandle(params("6.4.0", "6.2.0"))).toBe(true);
    });

    it("returns false when current is already at 6.3.0", async () => {
        expect(await upgrade.canHandle(params("6.3.0", "6.3.0"))).toBe(false);
    });

    it("returns false when current is above 6.3.0", async () => {
        expect(await upgrade.canHandle(params("6.4.0", "6.3.0"))).toBe(false);
    });

    it("returns false when target is below 6.3.0", async () => {
        expect(await upgrade.canHandle(params("6.2.0", "6.1.0"))).toBe(false);
    });

    it("returns true when target is a pre-release of 6.3.0 and current is below 6.3.0", async () => {
        expect(await upgrade.canHandle(params("6.3.0-beta.0", "6.2.0"))).toBe(true);
        expect(await upgrade.canHandle(params("6.3.0-unstable.0", "6.2.0"))).toBe(true);
        expect(await upgrade.canHandle(params("6.3.0-alpha.1", "6.2.0"))).toBe(true);
    });

    it("returns true when current is a pre-release of 6.3.0 and target is above 6.3.0", async () => {
        expect(await upgrade.canHandle(params("6.4.0", "6.3.0-beta.0"))).toBe(true);
        expect(await upgrade.canHandle(params("6.4.0", "6.3.0-local-npm.11"))).toBe(true);
    });

    it("returns true when current and target are both pre-releases of 6.3.0", async () => {
        expect(await upgrade.canHandle(params("6.3.0-beta.3", "6.3.0-beta.0"))).toBe(true);
        expect(await upgrade.canHandle(params("6.3.0-beta.3", "6.3.0-beta.1"))).toBe(true);
        expect(await upgrade.canHandle(params("6.3.0-beta.3", "6.3.0-local-npm.11"))).toBe(true);
    });

    it("returns true when current is a pre-release of 6.3.0 and target is 6.3.0", async () => {
        expect(await upgrade.canHandle(params("6.3.0", "6.3.0-beta.0"))).toBe(true);
        expect(await upgrade.canHandle(params("6.3.0", "6.3.0-beta.1"))).toBe(true);
        expect(await upgrade.canHandle(params("6.3.0", "6.3.0-local-npm.11"))).toBe(true);
    });
});

describe("Upgrade 6.3.0 - execute", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("sets typescript devDependency to 6.0.3", async () => {
        const file = createMockPackageJsonFile();
        const upgrade = createContainer(file).resolve(Upgrade);
        await upgrade.execute();
        expect(file.getDevDependency("typescript")).toBe("6.0.3");
    });

    it("saves the package.json after setting dependencies", async () => {
        const file = createMockPackageJsonFile();
        const container = createContainer(file);
        const packageJsonTool = container.resolve(PackageJsonTool);
        const upgrade = container.resolve(Upgrade);
        await upgrade.execute();
        expect(packageJsonTool.save).toHaveBeenCalledWith(file);
    });

    it("throws when package.json cannot be loaded", async () => {
        const container = createContainer(null);
        const upgrade = container.resolve(Upgrade);
        await expect(upgrade.execute()).rejects.toThrow(PackageJsonLoadError);
    });

    it("reads webiny.config.tsx via webinyConfigTool", async () => {
        const container = createContainer();
        const webinyConfigTool = container.resolve(WebinyConfigTool);
        const upgrade = container.resolve(Upgrade);
        await upgrade.execute();
        expect(webinyConfigTool.read).toHaveBeenCalled();
    });

    it("calls addChild on the config file with Infra.Env.IsProd and encryption comment", async () => {
        const container = createContainer();
        const webinyConfigTool = container.resolve(WebinyConfigTool);
        const upgrade = container.resolve(Upgrade);
        await upgrade.execute();
        const mockFile = vi.mocked(webinyConfigTool.read).mock.results[0].value;
        expect(mockFile.addChild).toHaveBeenCalledWith(
            "Infra.Env.IsProd",
            expect.objectContaining({
                comment: expect.stringContaining("Encryption"),
                children: expect.any(Function)
            })
        );
    });

    it("saves the webiny config via webinyConfigTool", async () => {
        const container = createContainer();
        const webinyConfigTool = container.resolve(WebinyConfigTool);
        const upgrade = container.resolve(Upgrade);
        await upgrade.execute();
        const mockFile = vi.mocked(webinyConfigTool.read).mock.results[0].value;
        expect(webinyConfigTool.save).toHaveBeenCalledWith(mockFile);
    });

    it("calls packageManagerService.update when project uses yarn", async () => {
        const container = createContainer(createMockPackageJsonFile(), "yarn");
        const packageManagerService = container.resolve(PackageManagerService);
        const upgrade = container.resolve(Upgrade);
        await upgrade.execute();
        expect(packageManagerService.update).toHaveBeenCalledWith("4.14.1");
    });

    it("does not call packageManagerService.update when project does not use yarn", async () => {
        const container = createContainer(createMockPackageJsonFile(), "npm");
        const packageManagerService = container.resolve(PackageManagerService);
        const upgrade = container.resolve(Upgrade);
        await upgrade.execute();
        expect(packageManagerService.update).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 4.3 — Update `createUpgradeIntegrationHarness.ts` to register `WebinyConfigToolImpl`**

Add this import after the `PackageJsonTool as PackageJsonToolImpl` import:

```typescript
import { WebinyConfigTool as WebinyConfigToolImpl } from "../../tool/WebinyConfigTool/WebinyConfigTool.js";
```

Add `container.register(WebinyConfigToolImpl);` after `container.register(PackageJsonToolImpl);` (around line 159).

- [ ] **Step 4.4 — Delete `addInfraEncryption.ts` and `addInfraEncryption.test.ts`**

```bash
rm /Users/brunozoric/work/webiny/webiny-upgrades-v6/src/upgrades/6.3.0/addInfraEncryption.ts
rm /Users/brunozoric/work/webiny/webiny-upgrades-v6/src/upgrades/6.3.0/addInfraEncryption.test.ts
```

- [ ] **Step 4.5 — Run the 6.3.0 tests**

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && yarn test src/upgrades/6.3.0/ 2>&1 | tail -30
```

Expected: all tests pass (unit + integration). Fix any failures before continuing.

- [ ] **Step 4.6 — Run the full test suite**

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && yarn test 2>&1 | tail -30
```

Expected: all tests pass.

- [ ] **Step 4.7 — Commit**

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && git add src/upgrades/6.3.0/ src/__tests__/utils/createUpgradeIntegrationHarness.ts && git commit -m "refactor: use WebinyConfigTool in 6.3.0 upgrade, remove addInfraEncryption"
```

---

## Task 5: Post-task verification

- [ ] **Step 5.1 — Run the full post-task chain**

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && yarn lint:fix && yarn && yarn build && yarn test && yarn adio:check 2>&1 | tail -40
```

Expected: all steps succeed. Fix any issues and re-run.

- [ ] **Step 5.2 — Commit lint/format fixes if needed**

If `yarn lint:fix` made changes:

```bash
cd /Users/brunozoric/work/webiny/webiny-upgrades-v6 && git add -p && git commit -m "chore: lint fixes"
```
