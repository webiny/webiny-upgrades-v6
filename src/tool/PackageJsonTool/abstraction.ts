import { createAbstraction } from "../../utils/createAbstraction.js";
import { PackageJsonService as PackageJsonServiceAbstraction } from "../../service/PackageJson/index.js";

interface IPackageJsonTool {
    /**
     * If target is not provided, it will try to load "package.json" from the current working directory.
     */
    load(target?: string): PackageJsonServiceAbstraction.File | null;
    loadOrThrow(target?: string): PackageJsonServiceAbstraction.File;
    save(target: PackageJsonServiceAbstraction.File): void;
}

export const PackageJsonTool = createAbstraction<IPackageJsonTool>("Tool/PackageJsonTool");

export namespace PackageJsonTool {
    export type Interface = IPackageJsonTool;
    export type File = PackageJsonServiceAbstraction.File;
}
