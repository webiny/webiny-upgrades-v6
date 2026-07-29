import { describe, it, expect } from "vitest";
import path from "node:path";
import { createUpgradeIntegrationHarness } from "../utils/createUpgradeIntegrationHarness.js";

const fixtureDir = path.join(import.meta.dirname, "..", "fixtures", "chain", "before");

describe("Upgrade chain - integration", () => {
    it("runs all shipped upgrades from 6.0.0 to 6.5.0 in semver order", async () => {
        const harness = await createUpgradeIntegrationHarness({
            fixtureDir,
            currentVersion: "6.0.0",
            targetVersion: "6.5.0"
        });

        await harness.run();

        const history = harness.upgradeHistory.list();
        expect(history.map(entry => entry.version)).toEqual([
            "6.1.0",
            "6.2.0",
            "6.3.0",
            "6.4.0",
            "6.4.4",
            "6.5.0"
        ]);

        const pkg = harness.readPackageJson();

        expect(pkg.dependencies?.["@webiny/cli"]).toBe("6.5.0");
        expect(pkg.dependencies?.webiny).toBe("6.5.0");
        expect(pkg.dependencies?.["@webiny/mcp"]).toBe("6.5.0");

        expect(pkg.devDependencies?.["@types/node"]).toBe("^24.13.3");
        expect(pkg.devDependencies?.typescript).toBe("7.0.2");
        expect(pkg.packageManager).toBe("yarn@4.17.1");
        expect(pkg.dependencies?.react).toBe("18.3.1");
        expect(pkg.dependencies?.["react-dom"]).toBe("18.3.1");
        expect(pkg.devDependencies?.react).toBeUndefined();
        expect(pkg.devDependencies?.["react-dom"]).toBeUndefined();
        expect(pkg.devDependencies?.["@types/react"]).toBe("18.3.31");
    });
});
