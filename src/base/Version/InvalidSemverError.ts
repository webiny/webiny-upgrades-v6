export class InvalidSemverError extends Error {
    public readonly name = "InvalidSemverError";

    public constructor(public readonly input: string) {
        super(`Invalid semver version: "${input}"`);
    }
}
