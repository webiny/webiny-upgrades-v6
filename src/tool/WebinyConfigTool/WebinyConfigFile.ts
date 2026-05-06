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
