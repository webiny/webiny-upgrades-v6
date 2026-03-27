import { createAbstraction } from "~/utils/createAbstraction.js";

interface ILogger {
    debug(message: string, ...args: unknown[]): void;
    success(message: string, ...args: unknown[]): void;
    warning(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
}

export const Logger = createAbstraction<ILogger>("Service/Logger");

export namespace Logger {
    export type Interface = ILogger;
}
