import { createAbstraction } from "~/utils/createAbstraction.js";
import type { SemVer } from "semver";

interface INpmService {
    getLatestVersion(packageName: string): Promise<SemVer | null>;
    getVersion(packageName: string, version: string | SemVer): Promise<SemVer | null>;
}

export const NpmService = createAbstraction<INpmService>("Service/Npm");

export namespace NpmService {
    export type Interface = INpmService;
}
