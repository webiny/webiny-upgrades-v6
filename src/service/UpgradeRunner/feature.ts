import path from "node:path";
import { createFeature } from "../../utils/createFeature.js";
import { UpgradeRunner } from "./UpgradeRunner.js";
import { UpgradesDirectory } from "./UpgradesDirectory.js";

const defaultUpgradesDir = path.join(import.meta.dirname, "..", "..", "upgrades");

export const UpgradeRunnerFeature = createFeature({
    name: "Service/UpgradeRunner",
    register(container) {
        container.registerInstance(UpgradesDirectory, defaultUpgradesDir);
        container.register(UpgradeRunner);
    }
});
