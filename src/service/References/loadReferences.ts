import type { IReference } from "./abstractions.js";
import type { RegistryService } from "../Registry/index.js";
import type { Version } from "../../base/Version/index.js";
import { ReferencesFileInvalidError } from "./ReferencesFileInvalidError.js";
import { ReferencesFileMissingError } from "./ReferencesFileMissingError.js";

interface IReferencesSource {
    packageName: string;
    filePath: string;
}

/**
 * From 6.6.0 `references.json` is published as `@webiny/dependency-versions`. Before that it
 * shipped inside `@webiny/cli`, which 6.6.0 replaces with `@webiny/cli-aws`. The first source
 * that has the version wins, so no version cutoff is needed: `0.0.0-unstable.*` builds sort below
 * 6.6.0 but are built from current code.
 */
const SOURCES: IReferencesSource[] = [
    { packageName: "@webiny/dependency-versions", filePath: "references.json" },
    { packageName: "@webiny/cli", filePath: "files/references.json" }
];

interface ILoadReferencesParams {
    registry: RegistryService.Interface;
    version: Version;
}

/**
 * Reads `references.json` of the version being installed from the registry. It doesn't use
 * `node_modules`, so the result is the same before and after the install.
 */
export const loadReferences = async (params: ILoadReferencesParams): Promise<IReference[]> => {
    const { registry, version } = params;
    const sources = SOURCES.map(source => {
        return {
            ...source,
            label: `${source.packageName}@${version.raw}/${source.filePath}`
        };
    });
    for (const source of sources) {
        const content = await registry.getFile(source.packageName, version, source.filePath);
        if (content === null) {
            continue;
        }
        let references: IReference[] | undefined;
        try {
            references = JSON.parse(content)?.references;
        } catch {
            throw new ReferencesFileInvalidError(source.label);
        }
        if (!references?.length) {
            throw new ReferencesFileInvalidError(source.label);
        }
        return references;
    }
    throw new ReferencesFileMissingError(sources.map(source => source.label));
};
