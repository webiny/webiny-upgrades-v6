import { Project, SyntaxKind, ts } from "ts-morph";

export function addInfraEncryption(filePath: string): void {
    const project = new Project({
        compilerOptions: { jsx: ts.JsxEmit.ReactJSX },
        skipAddingFilesFromTsConfig: true
    });
    const sourceFile = project.addSourceFileAtPath(filePath);

    const fragment = sourceFile.getFirstDescendantByKind(SyntaxKind.JsxFragment);
    if (!fragment) {
        return;
    }

    const realChildren = fragment.getJsxChildren().filter(c => c.getKind() !== SyntaxKind.JsxText);
    const lastChild = realChildren[realChildren.length - 1];

    sourceFile.insertText(
        lastChild.getEnd(),
        [
            ``,
            `            {/* Encryption MUST always be configured for production environments. */}`,
            `            <Infra.Env.IsProd>`,
            `                <Infra.Encryption passphrase={process.env.WEBINY_ENCRYPTION_PASSPHRASE || ""} />`,
            `            </Infra.Env.IsProd>`
        ].join("\n")
    );

    sourceFile.saveSync();
}
