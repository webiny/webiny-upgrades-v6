import { createFeature } from "~/utils/createFeature.js";
import { UpgradeHandler } from "./UpgradeHandler.js";

export const UpgradeHandlerFeature = createFeature({
    name: "Base/UpgradeHandler",
    register(container) {
        container.register(UpgradeHandler);
    }
});
