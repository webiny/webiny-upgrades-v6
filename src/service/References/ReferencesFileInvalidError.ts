export class ReferencesFileInvalidError extends Error {
    public readonly name = "ReferencesFileInvalidError";

    public constructor(public readonly source: string) {
        super(
            `References file "${source}" is not valid JSON or is missing the "references" property.`
        );
    }
}
