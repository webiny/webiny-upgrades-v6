export class VersionNotFoundError extends Error {
    public readonly name = "VersionNotFoundError";

    public constructor(
        public readonly packageName: string,
        public readonly version: string
    ) {
        super(`${packageName} version "${version}" does not exist in the registry.`);
    }
}
