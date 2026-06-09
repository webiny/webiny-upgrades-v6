import { loadJsonFileSync } from "load-json-file";
import {
    type IReference,
    ReferencesService as ReferencesServiceAbstraction
} from "./abstractions.js";
import { Context } from "../../base/Context/index.js";
import { ReferencesFileInvalidError } from "./ReferencesFileInvalidError.js";
import { ReferencesFileMissingError } from "./ReferencesFileMissingError.js";

const REFERENCES_FILE_SEGMENTS = ["node_modules", "@webiny", "cli", "files", "references.json"];

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
        const filePath = this.context.resolve(...REFERENCES_FILE_SEGMENTS);
        let raw: IReferenceFile;
        try {
            raw = loadJsonFileSync<IReferenceFile>(filePath);
        } catch {
            throw new ReferencesFileMissingError(filePath);
        }
        if (!raw?.references?.length) {
            throw new ReferencesFileInvalidError(filePath);
        }
        return raw.references;
    }
}

export const ReferencesService = ReferencesServiceAbstraction.createImplementation({
    implementation: ReferencesServiceImpl,
    dependencies: [Context]
});
