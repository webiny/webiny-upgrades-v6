import { loadJsonFileSync } from "load-json-file";
import {
    type IReference,
    ReferencesService as ReferencesServiceAbstraction
} from "./abstractions.js";
import { Context } from "../../base/Context/index.js";

const REFERENCES_FILE_SEGMENTS = ["node_modules", "@webiny", "cli", "files", "references.json"];

interface IReferenceFile {
    references: IReference[];
}

class ReferencesServiceImpl implements ReferencesServiceAbstraction.Interface {
    private cache: IReference[] | undefined;

    public constructor(private readonly context: Context.Interface) {}

    public getReference(name: string): IReference | null {
        return (
            this.getCache().find(ref => {
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

    private getCache(): IReference[] {
        if (this.cache) {
            return this.cache;
        }
        const filePath = this.context.resolve(...REFERENCES_FILE_SEGMENTS);
        try {
            const raw = loadJsonFileSync<IReferenceFile>(filePath);
            if (!raw?.references?.length) {
                throw new Error(
                    `References file at "${filePath}" is empty or missing the "references" property.`
                );
            }
            this.cache = raw.references;
        } catch {
            throw new Error(
                `Failed to load references.json from "${filePath}". Make sure @webiny/cli is installed.`
            );
        }

        return this.cache;
    }
}

export const ReferencesService = ReferencesServiceAbstraction.createImplementation({
    implementation: ReferencesServiceImpl,
    dependencies: [Context]
});
