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

    public addImport(options: WebinyConfigTool.ImportOptions): void {
        const normalize = (
            entry: WebinyConfigTool.ImportEntry
        ): { name: string; alias?: string } => {
            if (typeof entry === "string") {
                return { name: entry };
            }
            const [name, alias] = Object.entries(entry)[0];
            return { name, alias };
        };

        const existing = this.sourceFile
            .getImportDeclarations()
            .find(d => d.getModuleSpecifierValue() === options.package);

        if (!existing) {
            this.sourceFile.addImportDeclaration({
                moduleSpecifier: options.package,
                namedImports: options.imports.map(e => {
                    const { name, alias } = normalize(e);
                    return alias ? { name, alias } : { name };
                })
            });
            return;
        }

        const importedNames = new Set(existing.getNamedImports().map(s => s.getName()));
        for (const entry of options.imports) {
            const { name, alias } = normalize(entry);
            if (importedNames.has(name)) {
                this.logger.warn(
                    `"${name}" is already imported from "${options.package}", skipping`
                );
                continue;
            }
            existing.addNamedImport(alias ? { name, alias } : { name });
            importedNames.add(name);
        }
    }

    public addChild(tag: string, options: WebinyConfigTool.ChildOptions = {}): void {
        this.addToContainer([], tag, options);
    }

    public insertBefore(
        ref: string,
        tag: string,
        options: WebinyConfigTool.ChildOptions = {}
    ): void {
        this.addToContainer([], tag, options, { mode: "before", ref });
    }

    public insertAfter(
        ref: string,
        tag: string,
        options: WebinyConfigTool.ChildOptions = {}
    ): void {
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
        /* v8 ignore start */
        if (!container) {
            const missing =
                containerPath.length > 0
                    ? containerPath[containerPath.length - 1]
                    : "root fragment";
            this.logger.warn(`<${missing}> not found in webiny.config.tsx, cannot add children`);
            return;
        }
        /* v8 ignore stop */

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
        /* v8 ignore start */
        if (!freshContainer) {
            this.logger.warn(`Container became unavailable during insertion, skipping`);
            return;
        }
        /* v8 ignore stop */
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
        /* v8 ignore start */
        if (!fragment) {
            return null;
        }
        /* v8 ignore stop */
        let current: JsxFragment | JsxElement = fragment;
        for (const tag of containerPath) {
            const child = this.findChild(this.getRealChildren(current), tag);
            /* v8 ignore start */
            if (!child || child.getKind() !== SyntaxKind.JsxElement) {
                return null;
            }
            /* v8 ignore stop */
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
