export class ReferencesFileInvalidError extends Error {
    public readonly name = "ReferencesFileInvalidError";

    public constructor(public readonly path: string) {
        super(`References file at "${path}" is empty or missing the "references" property.`);
    }
}
