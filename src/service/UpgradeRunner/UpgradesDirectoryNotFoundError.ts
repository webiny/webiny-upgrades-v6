export class UpgradesDirectoryNotFoundError extends Error {
    public readonly name = "UpgradesDirectoryNotFoundError";

    public constructor(public readonly path: string) {
        super(`Upgrades directory does not exist: "${path}".`);
    }
}
