import type { SourceFile } from "ts-morph";
import type { Logger } from "../../base/Logger/index.js";
import type { WebinyConfigTool } from "./abstraction.js";

export class WebinyConfigImports implements WebinyConfigTool.Imports {
    public constructor(
        private readonly sourceFile: SourceFile,
        private readonly logger: Logger.Interface
    ) {}

    public add(options: WebinyConfigTool.ImportOptions): void {
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
}
