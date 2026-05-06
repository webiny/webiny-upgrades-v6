import { createAbstraction } from "../../utils/createAbstraction.js";

interface AddChildOptions {
    comment?: string;
    props?: Record<string, string>;
    children?: (builder: IWebinyConfigBuilder) => void;
}

interface IWebinyConfigBuilder {
    addChild(tag: string, options?: AddChildOptions): void;
}

interface IWebinyConfigFile extends IWebinyConfigBuilder {
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
