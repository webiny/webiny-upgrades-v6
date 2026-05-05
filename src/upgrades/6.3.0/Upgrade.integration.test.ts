import { describe, it, expect } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { createUpgradeIntegrationHarness } from "../../__tests__/utils/createUpgradeIntegrationHarness.js";

const fixtureDir = path.join(import.meta.dirname, "__tests__", "fixtures", "before");
const fixtureNoYarnDir = path.join(import.meta.dirname, "__tests__", "fixtures", "before-no-yarn");

describe("Upgrade 6.3.0 - integration", () => {
    it("sets typescript devDependency to 6.0.3, updates yarn version, and pins @webiny/* to 6.3.0", async () => {
        const harness = await createUpgradeIntegrationHarness({
            fixtureDir,
            currentVersion: "6.2.0",
            targetVersion: "6.3.0"
        });

        await harness.run();

        const pkg = harness.readPackageJson();

        expect(pkg.devDependencies?.typescript).toBe("6.0.3");
        expect(pkg.packageManager).toBe("yarn@4.14.1");
        expect(pkg.dependencies?.["@webiny/cli"]).toBe("6.3.0");
        expect(pkg.dependencies?.webiny).toBe("6.3.0");
        expect(pkg.dependencies?.["@webiny/mcp"]).toBe("6.3.0");

        expect(
            fs.existsSync(path.join(harness.tmpDir, ".yarn", "releases", "yarn-4.14.1.cjs"))
        ).toBe(true);
        expect(harness.readFile(".yarnrc.yml")).toContain(
            "yarnPath: .yarn/releases/yarn-4.14.1.cjs"
        );

        expect(harness.upgradeHistory.list()).toContainEqual(
            expect.objectContaining({ version: "6.3.0" })
        );
    });

    it("sets typescript devDependency to 6.0.3 without touching packageManager when not a yarn project", async () => {
        const harness = await createUpgradeIntegrationHarness({
            fixtureDir: fixtureNoYarnDir,
            currentVersion: "6.2.0",
            targetVersion: "6.3.0"
        });

        await harness.run();

        const pkg = harness.readPackageJson();

        expect(pkg.devDependencies?.typescript).toBe("6.0.3");
        expect(pkg.packageManager).toBeUndefined();
        expect(pkg.dependencies?.["@webiny/cli"]).toBe("6.3.0");

        expect(harness.upgradeHistory.list()).toContainEqual(
            expect.objectContaining({ version: "6.3.0" })
        );
    });
});
