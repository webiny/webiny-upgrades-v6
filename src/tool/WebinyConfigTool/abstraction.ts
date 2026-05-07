import { createAbstraction } from "../../utils/createAbstraction.js";

interface AddChildOptions {
    comment?: string;
    props?: Record<string, string>;
    children?: (jsx: IWebinyConfigJsx) => void;
}

interface IWebinyConfigJsx {
    addChild(tag: string, options?: AddChildOptions): void;
    insertBefore(ref: string, tag: string, options?: AddChildOptions): void;
    insertAfter(ref: string, tag: string, options?: AddChildOptions): void;
}

type IImportEntry = string | Record<string, string>;

interface AddImportOptions {
    package: string;
    imports: IImportEntry[];
}

interface IRemoveImportOptions {
    package: string;
    imports?: string[];
}

interface IWebinyConfigImports {
    add(options: AddImportOptions): void;
    remove(options: IRemoveImportOptions): void;
}

interface IWebinyConfigFile {
    imports: IWebinyConfigImports;
    jsx: IWebinyConfigJsx;
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
    export type Jsx = IWebinyConfigJsx;
    export type Imports = IWebinyConfigImports;
    export type ChildOptions = AddChildOptions;
    export type ImportEntry = IImportEntry;
    export type ImportOptions = AddImportOptions;
    export type RemoveImportOptions = IRemoveImportOptions;
}
