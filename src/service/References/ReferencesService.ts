import {
    type IReference,
    ReferencesService as ReferencesServiceAbstraction
} from "./abstractions.js";

/**
 * Answers lookups from a `references.json` that was already loaded. `loadReferences()` fetches it
 * from the registry before the container is built, so lookups stay synchronous.
 */
export class ReferencesService implements ReferencesServiceAbstraction.Interface {
    public constructor(private readonly references: IReference[]) {}

    public getReference(name: string): IReference | null {
        return (
            this.references.find(ref => {
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
}
