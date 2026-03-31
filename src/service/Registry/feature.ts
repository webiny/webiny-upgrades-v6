import { createFeature } from "../../utils/createFeature.js";
import { RegistryService } from "./RegistryService.js";

export const RegistryFeature = createFeature({
    name: "Service/Registry",
    register(container) {
        container.register(RegistryService);
    }
});
