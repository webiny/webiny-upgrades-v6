export class LatestVersionUnavailableError extends Error {
    public readonly name = "LatestVersionUnavailableError";

    public constructor(public readonly packageName: string) {
        super(`Failed to fetch latest version of ${packageName}.`);
    }
}
