export class ReferencesFileMissingError extends Error {
    public readonly name = "ReferencesFileMissingError";

    public constructor(public readonly path: string) {
        super(`Failed to load references.json from "${path}". Make sure @webiny/cli is installed.`);
    }
}
