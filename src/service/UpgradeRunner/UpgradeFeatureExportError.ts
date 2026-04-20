export class UpgradeFeatureExportError extends Error {
    public readonly name = "UpgradeFeatureExportError";

    public constructor(public readonly version: string) {
        super(`Upgrade script "${version}/index.ts" does not export a valid feature.`);
    }
}
