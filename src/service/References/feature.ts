import { createFeature } from "../../utils/createFeature.js";
import { ReferencesService } from "./ReferencesService.js";

export const ReferencesFeature = createFeature({
    name: "Service/References",
    register(container) {
        container.register(ReferencesService);
    }
});
