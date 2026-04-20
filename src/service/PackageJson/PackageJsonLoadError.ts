export class PackageJsonLoadError extends Error {
    public readonly name = "PackageJsonLoadError";

    public constructor(public readonly path: string) {
        super(`Failed to load ${path}`);
    }
}
