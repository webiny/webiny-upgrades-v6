import type { Context, CreateContextParams } from "./types.js";

export const createContext = (params: CreateContextParams): Context => {
    return {
        version: params.version,
        root: params.root,
        log: params.log
    };
};
