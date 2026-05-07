import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Container } from "@webiny/di";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WebinyConfigTool } from "./WebinyConfigTool.js";
import { WebinyConfigTool as WebinyConfigToolAbstraction } from "./abstraction.js";
import { Context } from "../../base/Context/index.js";
import { Logger } from "../../base/Logger/index.js";
import { createMockLogger } from "../../__tests__/utils/mockLogger.js";

const createContainer = (cwd: string) => {
    const container = new Container();
    container.registerInstance(Context, {
        cwd,
        registry: "",
        inputVersion: "0.0.0",
        targetVersion: {} as never,
        installedVersion: {} as never,
        currentVersion: {} as never,
        setCurrentVersion: vi.fn(),
        resolve: (...segments: string[]) => path.join(cwd, ...segments)
    });
    container.registerInstance(Logger, createMockLogger());
    container.register(WebinyConfigTool);
    return container;
};

describe("WebinyConfigTool", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "webiny-tool-test-"));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true });
    });

    it("read() returns a file object when webiny.config.tsx exists", () => {
        fs.writeFileSync(path.join(tmpDir, "webiny.config.tsx"), "export const x = 1;");
        const tool = createContainer(tmpDir).resolve(WebinyConfigToolAbstraction);
        const file = tool.read();
        expect(typeof file.addChild).toBe("function");
        expect(typeof file.save).toBe("function");
    });

    it("read() throws when webiny.config.tsx does not exist", () => {
        const tool = createContainer(tmpDir).resolve(WebinyConfigToolAbstraction);
        expect(() => tool.read()).toThrow("webiny.config.tsx not found");
    });

    it("save() calls file.save()", () => {
        const mockFile = {
            addImport: vi.fn(),
            addChild: vi.fn(),
            insertBefore: vi.fn(),
            insertAfter: vi.fn(),
            save: vi.fn()
        };
        const tool = createContainer(tmpDir).resolve(WebinyConfigToolAbstraction);
        tool.save(mockFile);
        expect(mockFile.save).toHaveBeenCalledOnce();
    });
});
