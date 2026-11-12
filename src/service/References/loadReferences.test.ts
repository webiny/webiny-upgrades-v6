import { describe, it, expect, vi } from "vitest";
import { loadReferences } from "./loadReferences.js";
import { ReferencesFileInvalidError } from "./ReferencesFileInvalidError.js";
import { ReferencesFileMissingError } from "./ReferencesFileMissingError.js";
import { Version } from "../../base/Version/index.js";
import type { RegistryService } from "../Registry/index.js";

const DEPENDENCY_VERSIONS = "@webiny/dependency-versions/references.json";
const CLI = "@webiny/cli/files/references.json";

const createRegistry = (files: Record<string, string>) => {
    const getFile = vi.fn(async (packageName: string, _: unknown, filePath: string) => {
        return files[`${packageName}/${filePath}`] ?? null;
    });
    return {
        registry: { getFile } as unknown as RegistryService.Interface,
        getFile
    };
};

const referencesJson = (version: string) => {
    return JSON.stringify({ references: [{ name: "react", versions: [{ version }] }] });
};

describe("loadReferences", () => {
    it("reads @webiny/dependency-versions of the given version", async () => {
        const { registry, getFile } = createRegistry({
            [DEPENDENCY_VERSIONS]: referencesJson("19.3.1"),
            [CLI]: referencesJson("18.3.1")
        });
        const version = Version.create("6.6.0");
        const references = await loadReferences({ registry, version });
        expect(references[0].versions[0].version).toBe("19.3.1");
        expect(getFile).toHaveBeenCalledTimes(1);
        expect(getFile).toHaveBeenCalledWith(
            "@webiny/dependency-versions",
            version,
            "references.json"
        );
    });

    it("falls back to @webiny/cli when the version has no @webiny/dependency-versions", async () => {
        const { registry, getFile } = createRegistry({ [CLI]: referencesJson("18.3.1") });
        const version = Version.create("6.5.0");
        const references = await loadReferences({ registry, version });
        expect(references[0].versions[0].version).toBe("18.3.1");
        expect(getFile).toHaveBeenLastCalledWith("@webiny/cli", version, "files/references.json");
    });

    it("reads @webiny/dependency-versions for an unstable build that sorts below 6.6.0", async () => {
        const { registry } = createRegistry({ [DEPENDENCY_VERSIONS]: referencesJson("19.3.1") });
        const references = await loadReferences({
            registry,
            version: Version.create("0.0.0-unstable.abcde")
        });
        expect(references[0].versions[0].version).toBe("19.3.1");
    });

    it("names every source it tried when none has the file", async () => {
        const { registry } = createRegistry({});
        const promise = loadReferences({ registry, version: Version.create("6.6.0") });
        await expect(promise).rejects.toThrow(ReferencesFileMissingError);
        await expect(promise).rejects.toThrow(
            `Failed to load references.json from "@webiny/dependency-versions@6.6.0/references.json" or "@webiny/cli@6.6.0/files/references.json".`
        );
    });

    it("throws ReferencesFileInvalidError when the file is not JSON", async () => {
        const { registry } = createRegistry({ [CLI]: "not json" });
        await expect(
            loadReferences({ registry, version: Version.create("6.5.0") })
        ).rejects.toThrow(ReferencesFileInvalidError);
    });

    it("throws ReferencesFileInvalidError when the references array is empty", async () => {
        const { registry } = createRegistry({ [CLI]: JSON.stringify({ references: [] }) });
        await expect(
            loadReferences({ registry, version: Version.create("6.5.0") })
        ).rejects.toThrow(ReferencesFileInvalidError);
    });
});
