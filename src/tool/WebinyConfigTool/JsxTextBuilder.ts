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
            // The element is new, so its only children are the ones added through this builder.
            const childTags = new Set<string>();
            const syntheticBuilder: WebinyConfigTool.Jsx = {
                addChild: (childTag: string, childOpts?: WebinyConfigTool.ChildOptions) => {
                    childTags.add(childTag);
                    childLines.push(this.buildElement(childTag, childOpts ?? {}, childIndent));
                },
                insertBefore: (
                    _ref: string,
                    childTag: string,
                    childOpts?: WebinyConfigTool.ChildOptions
                ) => {
                    childTags.add(childTag);
                    childLines.push(this.buildElement(childTag, childOpts ?? {}, childIndent));
                },
                insertAfter: (
                    _ref: string,
                    childTag: string,
                    childOpts?: WebinyConfigTool.ChildOptions
                ) => {
                    childTags.add(childTag);
                    childLines.push(this.buildElement(childTag, childOpts ?? {}, childIndent));
                },
                contains: (childTag: string) => childTags.has(childTag)
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
