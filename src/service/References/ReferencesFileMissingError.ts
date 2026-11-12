export class ReferencesFileMissingError extends Error {
    public readonly name = "ReferencesFileMissingError";

    public constructor(public readonly sources: string[]) {
        super(
            `Failed to load references.json from ${sources.map(source => `"${source}"`).join(" or ")}. Check that the version is published and the registry is reachable.`
        );
    }
}
