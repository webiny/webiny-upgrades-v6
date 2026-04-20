import { describe, it, expect } from "vitest";
import path from "node:path";
import { UpgradeRunner } from "./abstraction.js";
import { createIntegrationContainer } from "../../__tests__/utils/createIntegrationContainer.js";
import { Version } from "../../base/Version/index.js";

const v = (version: string) => Version.create(version);

const fixturesDir = path.join(import.meta.dirname, "..", "..", "__tests__", "fixtures");
const upgradesDir = path.join(fixturesDir, "upgrades");
const invalidDir = path.join(fixturesDir, "invalid-upgrades");

describe("UpgradeRunner", () => {
    describe("happy path", () => {
        it("runs all upgrades whose canHandle returns true, in semver order", async () => {
            const { container, ctx } = createIntegrationContainer({
                upgradesDir,
                currentVersion: "5.9.0",
                targetVersion: "6.1.0"
            });

            await container.resolve(UpgradeRunner).run();

            expect(ctx.setCurrentVersion).toHaveBeenCalledTimes(3);
            expect(ctx.setCurrentVersion).toHaveBeenNthCalledWith(1, v("6.0.0"));
            expect(ctx.setCurrentVersion).toHaveBeenNthCalledWith(2, v("6.0.1"));
            expect(ctx.setCurrentVersion).toHaveBeenNthCalledWith(3, v("6.1.0"));
        });

        it("advances context.currentVersion after each upgrade", async () => {
            const { container, ctx } = createIntegrationContainer({
                upgradesDir,
                currentVersion: "5.9.0",
                targetVersion: "6.1.0"
            });

            await container.resolve(UpgradeRunner).run();

            expect(ctx.setCurrentVersion).toHaveBeenCalledTimes(3);
            expect(ctx.setCurrentVersion).toHaveBeenNthCalledWith(1, v("6.0.0"));
            expect(ctx.setCurrentVersion).toHaveBeenNthCalledWith(2, v("6.0.1"));
            expect(ctx.setCurrentVersion).toHaveBeenNthCalledWith(3, v("6.1.0"));
        });

        it("only runs upgrades within the target range", async () => {
            const { container, ctx } = createIntegrationContainer({
                upgradesDir,
                currentVersion: "6.0.0",
                targetVersion: "6.0.1"
            });

            await container.resolve(UpgradeRunner).run();

            expect(ctx.setCurrentVersion).toHaveBeenCalledTimes(1);
            expect(ctx.setCurrentVersion).toHaveBeenCalledWith(v("6.0.1"));
        });

        it("calls packageManager.install on success", async () => {
            const { container, yarn } = createIntegrationContainer({
                upgradesDir,
                currentVersion: "5.9.0",
                targetVersion: "6.1.0"
            });

            await container.resolve(UpgradeRunner).run();

            expect(yarn.install).toHaveBeenCalledOnce();
        });
    });

    describe("directory filtering", () => {
        it("skips the __tests__ directory in the upgrades dir", async () => {
            // fixtures/upgrades contains a __tests__/.gitkeep — the runner must
            // not treat it as a version directory.
            const { container, ctx } = createIntegrationContainer({
                upgradesDir,
                currentVersion: "5.9.0",
                targetVersion: "6.1.0"
            });

            await container.resolve(UpgradeRunner).run();

            // Only the 3 real upgrades ran; __tests__ was skipped silently.
            expect(ctx.setCurrentVersion).toHaveBeenCalledTimes(3);
        });
    });

    describe("error cases", () => {
        it("throws when the upgrades directory does not exist", async () => {
            const { container } = createIntegrationContainer({
                upgradesDir: "/does/not/exist",
                currentVersion: "5.9.0",
                targetVersion: "6.1.0"
            });

            await expect(container.resolve(UpgradeRunner).run()).rejects.toThrow(
                "Upgrades directory does not exist"
            );
        });

        it("throws when upgrades directory has no subdirectories", async () => {
            const { container } = createIntegrationContainer({
                upgradesDir: path.join(invalidDir, "empty-dir"),
                currentVersion: "5.9.0",
                targetVersion: "6.1.0"
            });

            await expect(container.resolve(UpgradeRunner).run()).rejects.toThrow(
                "No upgrade scripts found"
            );
        });

        it("throws when a directory name is not valid semver", async () => {
            const { container } = createIntegrationContainer({
                upgradesDir: path.join(invalidDir, "invalid-dir-name"),
                currentVersion: "5.9.0",
                targetVersion: "6.1.0"
            });

            await expect(container.resolve(UpgradeRunner).run()).rejects.toThrow(
                "is not a valid semver version"
            );
        });

        it("throws when index.ts is missing from an upgrade directory", async () => {
            const { container } = createIntegrationContainer({
                upgradesDir: path.join(invalidDir, "missing-index"),
                currentVersion: "5.9.0",
                targetVersion: "6.1.0"
            });

            await expect(container.resolve(UpgradeRunner).run()).rejects.toThrow(
                "is missing an index.ts file"
            );
        });

        it("throws when index.ts does not export a valid feature", async () => {
            const { container } = createIntegrationContainer({
                upgradesDir: path.join(invalidDir, "bad-export"),
                currentVersion: "5.9.0",
                targetVersion: "6.1.0"
            });

            await expect(container.resolve(UpgradeRunner).run()).rejects.toThrow(
                "does not export a valid feature"
            );
        });
    });
});
