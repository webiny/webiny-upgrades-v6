import { createFeature } from "../../utils/createFeature.js";
import { UpgradeHistory } from "./UpgradeHistory.js";

export const UpgradeHistoryFeature = createFeature({
    name: "Tool/UpgradeHistory",
    register(container) {
        container.register(UpgradeHistory);
    }
});
