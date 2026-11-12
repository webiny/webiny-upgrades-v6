import { loadJsonFileSync } from "load-json-file";
import {
    type IReference,
    ReferencesService as ReferencesServiceAbstraction
} from "./abstractions.js";
import { Context } from "../../base/Context/index.js";
import { ReferencesFileInvalidError } from "./ReferencesFileInvalidError.js";
import { ReferencesFileMissingError } from "./ReferencesFileMissingError.js";

/**
 * From 6.6.0 `references.json` ships with `@webiny/cli-core`. Before that it shipped with
 * `@webiny/cli`, which 6.6.0 replaces with `@webiny/cli-aws`. Mid-upgrade, before the install,
 * the project still has the old one, so both are tried, the current location first.
 */
const REFERENCES_FILE_CANDIDATES = [
    ["node_modules", "@webiny", "cli-core", "files", "references.json"],
    ["node_modules", "@webiny", "cli", "files", "references.json"]
];

interface IReferenceFile {
    references: IReference[];
}

class ReferencesServiceImpl implements ReferencesServiceAbstraction.Interface {
    public constructor(private readonly context: Context.Interface) {}

    public getReference(name: string): IReference | null {
        return (
            this.load().find(ref => {
                return ref.name === name;
            }) || null
        );
    }

    public getVersion(name: string): string | null {
        const ref = this.getReference(name);
        if (!ref?.versions?.length) {
            return null;
        }
        return ref.versions[0].version || null;
    }

    private load(): IReference[] {
        const filePaths = REFERENCES_FILE_CANDIDATES.map(segments =>
            this.context.resolve(...segments)
        );
        for (const filePath of filePaths) {
            let raw: IReferenceFile;
            try {
                raw = loadJsonFileSync<IReferenceFile>(filePath);
            } catch {
                continue;
            }
            if (!raw?.references?.length) {
                throw new ReferencesFileInvalidError(filePath);
            }
            return raw.references;
        }
        throw new ReferencesFileMissingError(filePaths);
    }
}

export const ReferencesService = ReferencesServiceAbstraction.createImplementation({
    implementation: ReferencesServiceImpl,
    dependencies: [Context]
});
