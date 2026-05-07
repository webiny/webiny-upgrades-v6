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

type IImportEntry = string | Record<string, string>;

interface AddImportOptions {
    package: string;
    imports: IImportEntry[];
}

interface IWebinyConfigFile extends IWebinyConfigBuilder {
    addImport(options: AddImportOptions): void;
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
    export type ImportEntry = IImportEntry;
    export type ImportOptions = AddImportOptions;
}
