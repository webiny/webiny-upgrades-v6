import { gunzipSync } from "node:zlib";

const BLOCK_SIZE = 512;

const readString = (block: Buffer, start: number, length: number): string => {
    const value = block.subarray(start, start + length);
    const end = value.indexOf(0);
    return value.subarray(0, end === -1 ? value.length : end).toString("utf8");
};

/**
 * Returns the contents of one file in a gzipped tarball, or null when the tarball doesn't have it.
 * npm tarballs put every file under `package/`, so `filePath` is relative to that folder.
 */
export const readTarballFile = (tarball: Buffer, filePath: string): string | null => {
    const tar = gunzipSync(tarball);
    const target = `package/${filePath}`;
    let offset = 0;
    while (offset + BLOCK_SIZE <= tar.length) {
        const header = tar.subarray(offset, offset + BLOCK_SIZE);
        const name = readString(header, 0, 100);
        if (!name) {
            return null;
        }
        const prefix = readString(header, 345, 155);
        const size = parseInt(readString(header, 124, 12).trim() || "0", 8);
        const dataStart = offset + BLOCK_SIZE;
        if ((prefix ? `${prefix}/${name}` : name) === target) {
            return tar.subarray(dataStart, dataStart + size).toString("utf8");
        }
        offset = dataStart + Math.ceil(size / BLOCK_SIZE) * BLOCK_SIZE;
    }
    return null;
};
