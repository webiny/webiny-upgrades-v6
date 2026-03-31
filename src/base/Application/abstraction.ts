import { createAbstraction } from "../../utils/createAbstraction.js";

interface IApplication {
    execute(): Promise<void>;
}

export const Application = createAbstraction<IApplication>("Base/Application");

export namespace Application {
    export type Interface = IApplication;
}
