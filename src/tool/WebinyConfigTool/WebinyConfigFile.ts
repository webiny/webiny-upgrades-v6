import { Project, ts } from "ts-morph";
import type { Logger } from "../../base/Logger/index.js";
import { WebinyConfigImports } from "./WebinyConfigImports.js";
import { WebinyConfigJsx } from "./WebinyConfigJsx.js";
import { WebinyConfigTool } from "./abstraction.js";

export class WebinyConfigFile implements WebinyConfigTool.File {
    private readonly sourceFile;
    public readonly imports;
    public readonly jsx;

    public constructor(filePath: string, logger: Logger.Interface) {
        const project = new Project({
            compilerOptions: { jsx: ts.JsxEmit.ReactJSX },
            skipAddingFilesFromTsConfig: true
        });
        this.sourceFile = project.addSourceFileAtPath(filePath);
        this.imports = new WebinyConfigImports(this.sourceFile, logger);
        this.jsx = new WebinyConfigJsx(this.sourceFile, logger);
    }

    public save(): void {
        this.sourceFile.saveSync();
    }
}
