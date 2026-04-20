import { describe, it, expect } from "vitest";
import path from "node:path";
import { createUpgradeIntegrationHarness } from "../../__tests__/utils/createUpgradeIntegrationHarness.js";

const fixtureDir = path.join(import.meta.dirname, "__tests__", "fixtures", "before");

describe("Upgrade 6.1.0 - integration", () => {
    it("moves react to deps, adds @types, pins @webiny/* to 6.1.0", async () => {
        const harness = await createUpgradeIntegrationHarness({
            fixtureDir,
            currentVersion: "6.0.0",
            targetVersion: "6.1.0"
        });

        await harness.run();

        const pkg = harness.readPackageJson();

        expect(pkg.dependencies?.react).toBe("18.2.0");
        expect(pkg.dependencies?.["react-dom"]).toBe("18.2.0");
        expect(pkg.devDependencies?.react).toBeUndefined();
        expect(pkg.devDependencies?.["react-dom"]).toBeUndefined();
        expect(pkg.devDependencies?.["@types/react"]).toBe("18.2.79");
        expect(pkg.devDependencies?.["@types/react-dom"]).toBe("18.2.25");
        expect(pkg.dependencies?.["@webiny/cli"]).toBe("6.1.0");

        expect(harness.upgradeHistory.list()).toContainEqual(
            expect.objectContaining({ version: "6.1.0" })
        );
    });
});
