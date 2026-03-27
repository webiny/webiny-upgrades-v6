import { createAbstraction } from "~/utils/createAbstraction.js";
import type { PackageJson as PackageJsonFileData } from "type-fest";
import type { SemVer } from "semver";

interface IPackageJsonFile {
    readonly path: string;

    readonly raw: Required<PackageJsonFileData>;

    getDependencies(): Record<string, string>;
    getDevDependencies(): Record<string, string>;
    getPeerDependencies(): Record<string, string>;
    getResolutions(): Record<string, string>;

    setDependency(name: string, version: string | SemVer): void;
    removeDependency(name: string): void;
    getDependency(name: string): string | null;

    setDevDependency(name: string, version: string | SemVer): void;
    removeDevDependency(name: string): void;
    getDevDependency(name: string): string | null;

    setPeerDependency(name: string, version: string | SemVer): void;
    removePeerDependency(name: string): void;
    getPeerDependency(name: string): string | null;

    setResolution(name: string, version: string | SemVer): void;
    removeResolution(name: string): void;
    getResolution(name: string): string | null;

    getVersion(): string | null;
}

export const PackageJsonFile = createAbstraction<IPackageJsonFile>("Service/PackageJsonFile");

export namespace PackageJsonFile {
    export type Interface = IPackageJsonFile;
    export type Data = Required<PackageJsonFileData>;
}

interface IPackageJsonService {
    load(target: string): IPackageJsonFile | null;
    save(target: IPackageJsonFile): void;
}

export const PackageJsonService = createAbstraction<IPackageJsonService>(
    "Service/PackageJsonService"
);

export namespace PackageJsonService {
    export type Interface = IPackageJsonService;
    export type File = IPackageJsonFile;
}
