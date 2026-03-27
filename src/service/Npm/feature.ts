import { createFeature } from "~/utils/createFeature.js";
import { NpmService } from "./NpmService.js";

export const NpmFeature = createFeature({
    name: "Service/Npm",
    register(container) {
        container.register(NpmService);
    }
});
