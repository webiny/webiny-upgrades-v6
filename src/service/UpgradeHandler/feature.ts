import { createFeature } from "../../utils/createFeature.js";
import { UpgradeHandler } from "./UpgradeHandler.js";

export const UpgradeHandlerFeature = createFeature({
    name: "Service/UpgradeHandler",
    register(container) {
        container.register(UpgradeHandler);
    }
});
