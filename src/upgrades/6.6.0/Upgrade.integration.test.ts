import { describe, it, expect } from "vitest";
import path from "node:path";
import { createUpgradeIntegrationHarness } from "../../__tests__/utils/createUpgradeIntegrationHarness.js";

const fixtureDir = path.join(import.meta.dirname, "__tests__", "fixtures", "before");

describe("Upgrade 6.6.0 - integration", () => {
    it("opts existing projects out of PITR and bucket versioning, and pins @webiny/* to 6.6.0", async () => {
        const harness = await createUpgradeIntegrationHarness({
            fixtureDir,
            currentVersion: "6.5.0",
            targetVersion: "6.6.0"
        });

        await harness.run();

        const pkg = harness.readPackageJson();
        expect(pkg.dependencies?.["@webiny/cli"]).toBe("6.6.0");
        expect(pkg.dependencies?.webiny).toBe("6.6.0");

        const webinyConfig = harness.readFile("webiny.config.tsx");
        expect(webinyConfig).toContain("<Infra.DynamoDb.PITR enabled={false} />");
        expect(webinyConfig).toContain("<Infra.FileManager.BucketVersioning enabled={false} />");
        expect(webinyConfig).toContain('<Infra.Aws.DefaultRegion name={"eu-central-1"} />');

        expect(harness.upgradeHistory.list()).toContainEqual(
            expect.objectContaining({ version: "6.6.0" })
        );
    });

    it("does not add the components twice when run again", async () => {
        const harness = await createUpgradeIntegrationHarness({
            fixtureDir,
            currentVersion: "6.5.0",
            targetVersion: "6.6.0"
        });

        await harness.run();
        await harness.run();

        const webinyConfig = harness.readFile("webiny.config.tsx");
        expect(webinyConfig.match(/<Infra\.DynamoDb\.PITR /g)).toHaveLength(1);
        expect(webinyConfig.match(/<Infra\.FileManager\.BucketVersioning /g)).toHaveLength(1);
    });
});
