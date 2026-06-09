import { createAbstraction } from "../../utils/createAbstraction.js";

export enum TPackageType {
    dependencies = "dependencies",
    devDependencies = "devDependencies",
    peerDependencies = "peerDependencies",
    resolutions = "resolutions"
}

export interface IReferenceVersionFile {
    file: string;
    types: TPackageType[];
}

export interface IReferenceVersion {
    version: string;
    files: IReferenceVersionFile[];
}

export interface IReference {
    name: string;
    versions: IReferenceVersion[];
}

interface IReferencesService {
    getReference(name: string): IReference | null;
    getVersion(name: string): string | null;
    clearCache(): void;
}

export const ReferencesService = createAbstraction<IReferencesService>("Service/ReferencesService");

export namespace ReferencesService {
    export type Interface = IReferencesService;
    export type Reference = IReference;
    export type ReferenceVersion = IReferenceVersion;
    export type ReferenceVersionFile = IReferenceVersionFile;
    export type PackageType = TPackageType;
}
