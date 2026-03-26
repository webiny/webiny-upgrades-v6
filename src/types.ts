import type { Log } from "./utils/log.js";

export interface Context {
    version: string;
    root: string;
    log: Log;
}

export interface CreateContextParams {
    version: string;
    root: string;
    log: Log;
}
