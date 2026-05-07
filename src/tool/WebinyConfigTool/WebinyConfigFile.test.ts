import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WebinyConfigFile } from "./WebinyConfigFile.js";
import { WebinyConfigImports } from "./WebinyConfigImports.js";
import { WebinyConfigJsx } from "./WebinyConfigJsx.js";
import { createMockLogger } from "../../__tests__/utils/mockLogger.js";

const FIXTURE = `export const Extensions = () => {
    return (
        <>
            <ProjectAws />
        </>
    );
};
`;

describe("WebinyConfigFile", () => {
    let tmpDir: string;
    let filePath: string;
    let logger: ReturnType<typeof createMockLogger>;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "webiny-config-test-"));
        filePath = path.join(tmpDir, "webiny.config.tsx");
        logger = createMockLogger();
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true });
    });

    const createFile = (content = FIXTURE): WebinyConfigFile => {
        fs.writeFileSync(filePath, content, "utf-8");
        return new WebinyConfigFile(filePath, logger);
    };

    it("exposes file.imports as a WebinyConfigImports instance", () => {
        expect(createFile().imports).toBeInstanceOf(WebinyConfigImports);
    });

    it("exposes file.jsx as a WebinyConfigJsx instance", () => {
        expect(createFile().jsx).toBeInstanceOf(WebinyConfigJsx);
    });

    it("save() writes pending mutations to disk", () => {
        const file = createFile();
        file.imports.add({ package: "@webiny/extensions", imports: ["Infra"] });
        expect(fs.readFileSync(filePath, "utf-8")).not.toContain("@webiny/extensions");
        file.save();
        expect(fs.readFileSync(filePath, "utf-8")).toContain("@webiny/extensions");
    });
});
