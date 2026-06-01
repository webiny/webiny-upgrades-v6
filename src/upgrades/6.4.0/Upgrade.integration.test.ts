import { describe, it, expect } from "vitest";
import path from "node:path";
import { createUpgradeIntegrationHarness } from "../../__tests__/utils/createUpgradeIntegrationHarness.js";

const fixtureDir = path.join(import.meta.dirname, "__tests__", "fixtures", "before");

describe("Upgrade 6.4.0 - integration", () => {
    it("sets @types/react devDependency to 18.3.29 and pins @webiny/* to 6.4.0", async () => {
        const harness = await createUpgradeIntegrationHarness({
            fixtureDir,
            currentVersion: "6.3.0",
            targetVersion: "6.4.0"
        });

        await harness.run();

        const pkg = harness.readPackageJson();

        expect(pkg.devDependencies?.["@types/react"]).toBe("18.3.29");
        expect(pkg.dependencies?.["@webiny/cli"]).toBe("6.4.0");
        expect(pkg.dependencies?.webiny).toBe("6.4.0");
        expect(pkg.dependencies?.["@webiny/mcp"]).toBe("6.4.0");

        expect(harness.upgradeHistory.list()).toContainEqual(
            expect.objectContaining({ version: "6.4.0" })
        );
    });
});
