import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { describe, it, expect } from "vitest";
import { readTarballFile } from "./readTarballFile.js";
import { createTarball } from "../../__tests__/utils/createTarball.js";

describe("readTarballFile", () => {
    it("returns the content of the requested file", () => {
        const tarball = createTarball({
            "package.json": `{"name":"x"}`,
            "files/references.json": `{"references":[]}`
        });
        expect(readTarballFile(tarball, "files/references.json")).toBe(`{"references":[]}`);
    });

    it("skips over files larger than one block", () => {
        const tarball = createTarball({
            "big.txt": "a".repeat(1500),
            "references.json": "ok"
        });
        expect(readTarballFile(tarball, "references.json")).toBe("ok");
    });

    it("returns null when the tarball doesn't have the file", () => {
        const tarball = createTarball({ "package.json": "{}" });
        expect(readTarballFile(tarball, "references.json")).toBeNull();
    });

    it("returns null when the archive ends without end-of-archive blocks", () => {
        const tar = gunzipSync(createTarball({ "package.json": "{}" }));
        const truncated = gzipSync(tar.subarray(0, 1024));
        expect(readTarballFile(truncated, "references.json")).toBeNull();
    });

    it("reads a tarball made by the system tar", () => {
        const dir = mkdtempSync(join(tmpdir(), "read-tarball-"));
        mkdirSync(join(dir, "package", "files"), { recursive: true });
        writeFileSync(join(dir, "package", "files", "references.json"), "from tar");
        const tgz = join(dir, "out.tgz");
        execFileSync("tar", ["-czf", tgz, "-C", dir, "package"]);
        expect(readTarballFile(readFileSync(tgz), "files/references.json")).toBe("from tar");
    });
});
