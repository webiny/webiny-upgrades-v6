import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Version } from "../base/Version/index.js";
import { Container } from "@webiny/di";
import { Upgrade } from "../base/Upgrade/abstraction.js";
import { isFeature } from "../utils/createFeature.js";
import { registerUpgradeDeps } from "../__tests__/utils/mockUpgradeDeps.js";

const upgradesDir = import.meta.dirname;

const directories = fs
    .readdirSync(upgradesDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && Version.parse(entry.name))
    .sort((a, b) => Version.create(a.name).compareTo(Version.create(b.name)));

describe("upgrades registry", () => {
    it("has at least one upgrade", () => {
        expect(directories.length).toBeGreaterThan(0);
    });

    for (const dir of directories) {
        describe(dir.name, () => {
            it("has an index.ts", () => {
                const indexPath = path.join(upgradesDir, dir.name, "index.ts");
                expect(fs.existsSync(indexPath)).toBe(true);
            });

            it("index.ts exports a valid feature as default", async () => {
                const indexPath = path.join(upgradesDir, dir.name, "index.ts");
                const mod = await import(pathToFileURL(indexPath).href);
                expect(isFeature(mod.default)).toBe(true);
            });

            it("resolves an Upgrade.Interface with version, canHandle, and execute", async () => {
                const indexPath = path.join(upgradesDir, dir.name, "index.ts");
                const mod = await import(pathToFileURL(indexPath).href);
                const container = new Container();
                registerUpgradeDeps(container);
                mod.default.register(container);
                const upgrade = container.resolve(Upgrade);
                expect(typeof upgrade.canHandle).toBe("function");
                expect(typeof upgrade.execute).toBe("function");
                expect(upgrade.version).not.toBeNull();
            });

            it("upgrade.version matches the folder name", async () => {
                const indexPath = path.join(upgradesDir, dir.name, "index.ts");
                const mod = await import(pathToFileURL(indexPath).href);
                const container = new Container();
                registerUpgradeDeps(container);
                mod.default.register(container);
                const upgrade = container.resolve(Upgrade);
                expect(upgrade.version).toEqual(Version.create(dir.name));
            });
        });
    }
});
