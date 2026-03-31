import { createAbstraction } from "../../utils/createAbstraction.js";
import type { Version } from "../../base/Version/index.js";

interface IRegistryService {
    getLatestVersion(packageName: string): Promise<Version | null>;
    getVersion(packageName: string, version: string | Version): Promise<Version | null>;
}

export const RegistryService = createAbstraction<IRegistryService>("Service/Registry");

export namespace RegistryService {
    export type Interface = IRegistryService;
}
