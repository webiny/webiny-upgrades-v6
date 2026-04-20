export class UpgradesDirectoryEmptyError extends Error {
    public readonly name = "UpgradesDirectoryEmptyError";

    public constructor(public readonly path: string) {
        super(`No upgrade scripts found in "${path}".`);
    }
}
