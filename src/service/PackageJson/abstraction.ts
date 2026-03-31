import { createAbstraction } from "../../utils/createAbstraction.js";
import type { PackageJson as PackageJsonFileData } from "type-fest";
import type { Version } from "../../base/Version/index.js";

interface IDependencies {
    [name: string]: string;
}

interface IDevDependencies {
    [name: string]: string;
}

interface IPeerDependencies {
    [name: string]: string;
}

interface IResolutions {
    [name: string]: string;
}

interface IPackageJsonFile {
    readonly path: string;

    readonly raw: Required<PackageJsonFileData>;

    getDependencies(): IDependencies;
    getDevDependencies(): IDevDependencies;
    getPeerDependencies(): IPeerDependencies;
    getResolutions(): IResolutions;

    setDependency(name: string, version: string | Version): void;
    setDependencyIfExists(name: string, version: string | Version): void;
    removeDependency(name: string): void;
    getDependency(name: string): string | null;

    setDevDependency(name: string, version: string | Version): void;
    setDevDependencyIfExists(name: string, version: string | Version): void;
    removeDevDependency(name: string): void;
    getDevDependency(name: string): string | null;

    setPeerDependency(name: string, version: string | Version): void;
    setPeerDependencyIfExists(name: string, version: string | Version): void;
    removePeerDependency(name: string): void;
    getPeerDependency(name: string): string | null;

    setResolution(name: string, version: string | Version): void;
    setResolutionIfExists(name: string, version: string | Version): void;
    removeResolution(name: string): void;
    getResolution(name: string): string | null;

    getVersion(): string | null;

    get(key: string): unknown;
    set(key: string, value: unknown): void;
}

export const PackageJsonFile = createAbstraction<IPackageJsonFile>("Service/PackageJsonFile");

export namespace PackageJsonFile {
    export type Interface = IPackageJsonFile;
    export type Data = Required<PackageJsonFileData>;
    export type Dependencies = IDependencies;
    export type DevDependencies = IDevDependencies;
    export type PeerDependencies = IPeerDependencies;
    export type Resolutions = IResolutions;
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
