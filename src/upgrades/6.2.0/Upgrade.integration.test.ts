import { describe, it, expect } from "vitest";
import path from "node:path";
import { createUpgradeIntegrationHarness } from "../../__tests__/utils/createUpgradeIntegrationHarness.js";

const fixtureDir = path.join(import.meta.dirname, "__tests__", "fixtures", "before");

describe("Upgrade 6.2.0 - integration", () => {
    it("updates react + types and pins @webiny/* to 6.2.0", async () => {
        const harness = await createUpgradeIntegrationHarness({
            fixtureDir,
            currentVersion: "6.1.0",
            targetVersion: "6.2.0"
        });

        await harness.run();

        const pkg = harness.readPackageJson();

        expect(pkg.dependencies?.react).toBe("18.3.1");
        expect(pkg.dependencies?.["react-dom"]).toBe("18.3.1");
        expect(pkg.devDependencies?.["@types/node"]).toBe("24.12.2");
        expect(pkg.devDependencies?.["@types/react"]).toBe("18.3.28");
        expect(pkg.devDependencies?.["@types/react-dom"]).toBe("18.3.7");
        expect(pkg.dependencies?.["@webiny/cli"]).toBe("6.2.0");

        expect(harness.upgradeHistory.list()).toContainEqual(
            expect.objectContaining({ version: "6.2.0" })
        );
    });
});
