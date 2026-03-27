import { createAbstraction } from "~/utils/createAbstraction.js";

interface IInput {
    cwd: string;
    registry: string;
    version: string;
}

export const Input = createAbstraction<IInput>("Base/Input");

export namespace Input {
    export type Interface = IInput;
}
