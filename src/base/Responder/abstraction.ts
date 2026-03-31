import { createAbstraction } from "../../utils/createAbstraction.js";

interface IResponder {
    success(duration: number, message?: string): never;
    error(message: string, duration: number, error?: Error): never;
}

export const Responder = createAbstraction<IResponder>("Base/Responder");

export namespace Responder {
    export type Interface = IResponder;
}
