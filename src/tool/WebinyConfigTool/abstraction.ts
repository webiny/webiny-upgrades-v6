import { createAbstraction } from "../../utils/createAbstraction.js";

export interface AddChildOptions {
    comment?: string;
    props?: Record<string, string>;
    children?: (builder: IWebinyConfigBuilder) => void;
}

export interface IWebinyConfigBuilder {
    addChild(tag: string, options?: AddChildOptions): void;
}

export interface IWebinyConfigFile extends IWebinyConfigBuilder {
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
}
