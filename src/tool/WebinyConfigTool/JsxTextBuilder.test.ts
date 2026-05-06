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
        expect(result).toBe("    <Parent>\n        <Child />\n    </Parent>");
    });
});
