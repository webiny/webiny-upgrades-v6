import { createAbstraction } from "../../utils/createAbstraction.js";
import type { Version } from "../../base/Version/index.js";

interface IRegistryService {
    getLatestVersion(packageName: string): Promise<Version | null>;
    getVersion(packageName: string, version: string | Version): Promise<Version | null>;
    /**
     * Reads one file out of a published package's tarball. `filePath` is relative to the package
     * root. Returns null when the version or the file doesn't exist, or the download fails.
     */
    getFile(
        packageName: string,
        version: string | Version,
        filePath: string
    ): Promise<string | null>;
}

export const RegistryService = createAbstraction<IRegistryService>("Service/Registry");

export namespace RegistryService {
    export type Interface = IRegistryService;
}
