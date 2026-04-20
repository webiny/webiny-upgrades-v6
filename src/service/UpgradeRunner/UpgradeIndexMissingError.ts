export class UpgradeIndexMissingError extends Error {
    public readonly name = "UpgradeIndexMissingError";

    public constructor(public readonly version: string) {
        super(`Upgrade directory "${version}" is missing an index.ts file.`);
    }
}
