import { createFeature } from "../../utils/createFeature.js";
import { DependencyGuard } from "./DependencyGuard.js";

export const DependencyGuardFeature = createFeature({
    name: "Tool/DependencyGuard",
    register(container) {
        container.register(DependencyGuard);
    }
});
