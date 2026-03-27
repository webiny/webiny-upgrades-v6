import { createFeature } from "~/utils/createFeature.js";
import { VersionService } from "./VersionService.js";

export const VersionServiceFeature = createFeature({
    name: "Service/Version",
    register(container) {
        container.register(VersionService);
    }
});
