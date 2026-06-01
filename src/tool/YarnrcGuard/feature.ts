import { createFeature } from "../../utils/createFeature.js";
import { YarnrcGuard } from "./YarnrcGuard.js";

export const YarnrcGuardFeature = createFeature({
    name: "Tool/YarnrcGuard",
    register(container) {
        container.register(YarnrcGuard);
    }
});
