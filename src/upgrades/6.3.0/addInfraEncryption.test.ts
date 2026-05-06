import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { addInfraEncryption } from "./addInfraEncryption.js";

const BEFORE = `import React from "react";
import { Infra } from "@webiny/project-aws";

export const Extensions = () => {
    return (
        <>
            <Infra.ProductionEnvironments environments={["prod", "production"]} />
            <Infra.Something />
        </>
    );
};
`;

describe("addInfraEncryption", () => {
    let tmpDir: string;
    let filePath: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "webiny-test-"));
        filePath = path.join(tmpDir, "webiny.config.tsx");
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true });
    });

    it("appends Infra.Env.IsProd block after the last JSX child", () => {
        fs.writeFileSync(filePath, BEFORE, "utf-8");

        addInfraEncryption(filePath);

        const content = fs.readFileSync(filePath, "utf-8");
        expect(content).toContain("<Infra.Env.IsProd>");
        expect(content).toContain(
            `<Infra.Encryption passphrase={process.env.WEBINY_ENCRYPTION_PASSPHRASE || ""} />`
        );
        expect(content).toContain("</Infra.Env.IsProd>");
    });

    it("places the new block after the last existing JSX child", () => {
        fs.writeFileSync(filePath, BEFORE, "utf-8");

        addInfraEncryption(filePath);

        const content = fs.readFileSync(filePath, "utf-8");
        const lastChildPos = content.indexOf("<Infra.Something />");
        const newBlockPos = content.indexOf("<Infra.Env.IsProd>");
        expect(lastChildPos).toBeLessThan(newBlockPos);
    });

    it("does nothing when the file has no JSX fragment", () => {
        const noFragment = `export const x = 1;`;
        fs.writeFileSync(filePath, noFragment, "utf-8");

        addInfraEncryption(filePath);

        expect(fs.readFileSync(filePath, "utf-8")).toBe(noFragment);
    });
});
