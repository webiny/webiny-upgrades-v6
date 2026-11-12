import { gzipSync } from "node:zlib";

const BLOCK_SIZE = 512;

const createHeader = (name: string, size: number): Buffer => {
    const header = Buffer.alloc(BLOCK_SIZE);
    header.write(name, 0, 100, "utf8");
    header.write("0000644\0", 100, 8, "ascii");
    header.write("0000000\0", 108, 8, "ascii");
    header.write("0000000\0", 116, 8, "ascii");
    header.write(`${size.toString(8).padStart(11, "0")}\0`, 124, 12, "ascii");
    header.write("00000000000\0", 136, 12, "ascii");
    header.write("0", 156, 1, "ascii");
    header.write("ustar\0", 257, 6, "ascii");
    header.write("00", 263, 2, "ascii");
    header.fill(" ", 148, 156);
    let checksum = 0;
    for (const byte of header) {
        checksum += byte;
    }
    header.write(`${checksum.toString(8).padStart(6, "0")}\0 `, 148, 8, "ascii");
    return header;
};

/**
 * Builds a gzipped tarball the way npm publishes one: every file under `package/`.
 */
export const createTarball = (files: Record<string, string>): Buffer => {
    const blocks: Buffer[] = [];
    for (const [path, content] of Object.entries(files)) {
        const data = Buffer.from(content, "utf8");
        blocks.push(createHeader(`package/${path}`, data.length));
        const padded = Buffer.alloc(Math.ceil(data.length / BLOCK_SIZE) * BLOCK_SIZE);
        data.copy(padded);
        blocks.push(padded);
    }
    blocks.push(Buffer.alloc(BLOCK_SIZE * 2));
    return gzipSync(Buffer.concat(blocks));
};
