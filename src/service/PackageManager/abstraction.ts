import { createAbstraction } from "../../utils/createAbstraction.js";
import type { Version } from "../../base/Version/index.js";

interface IPackageManager {
    install(): Promise<void>;
    version(): Promise<Version>;
}

export const PackageManager = createAbstraction<IPackageManager>("Service/PackageManager");

export namespace PackageManager {
    export type Interface = IPackageManager;
    export type InstallResponse = Promise<void>;
    export type VersionResponse = Promise<Version>;
}

interface IPackageManagerService {
    install(): Promise<void>;
    version(): Promise<Version>;
}

/**
 * Package manager service calls correct package manager implementation base on what user has in the project.
 */
export const PackageManagerService = createAbstraction<IPackageManagerService>(
    "Service/PackageManagerService"
);

export namespace PackageManagerService {
    export type Interface = IPackageManagerService;
    export type InstallResponse = Promise<void>;
    export type VersionResponse = Promise<Version>;
}
