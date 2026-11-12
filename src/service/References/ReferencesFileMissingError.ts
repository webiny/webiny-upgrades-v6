export class ReferencesFileMissingError extends Error {
    public readonly name = "ReferencesFileMissingError";

    public constructor(public readonly paths: string[]) {
        super(
            `Failed to load references.json from ${paths.map(path => `"${path}"`).join(" or ")}. Make sure @webiny/cli-core (6.6.0 and later) or @webiny/cli (before 6.6.0) is installed.`
        );
    }
}
