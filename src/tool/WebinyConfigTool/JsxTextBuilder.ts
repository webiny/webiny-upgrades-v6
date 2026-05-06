import type { WebinyConfigTool } from "./abstraction.js";

export class JsxTextBuilder {
    public buildElement(
        tag: string,
        options: WebinyConfigTool.ChildOptions,
        indent: string
    ): string {
        const lines: string[] = [];
        const propsStr = this.buildPropsStr(options.props);

        if (options.comment) {
            lines.push(`${indent}{/* ${options.comment} */}`);
        }

        if (options.children) {
            const childLines: string[] = [];
            const childIndent = indent + "    ";
            const syntheticBuilder: WebinyConfigTool.Builder = {
                addChild: (childTag: string, childOpts?: WebinyConfigTool.ChildOptions) => {
                    childLines.push(this.buildElement(childTag, childOpts ?? {}, childIndent));
                },
                insertBefore: (
                    _ref: string,
                    childTag: string,
                    childOpts?: WebinyConfigTool.ChildOptions
                ) => {
                    childLines.push(this.buildElement(childTag, childOpts ?? {}, childIndent));
                },
                insertAfter: (
                    _ref: string,
                    childTag: string,
                    childOpts?: WebinyConfigTool.ChildOptions
                ) => {
                    childLines.push(this.buildElement(childTag, childOpts ?? {}, childIndent));
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
        return (
            " " +
            Object.entries(props)
                .map(([k, v]) => `${k}={${v}}`)
                .join(" ")
        );
    }
}
