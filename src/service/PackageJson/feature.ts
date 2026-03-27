import { createFeature } from "~/utils/createFeature.js";
import { PackageJsonService } from "./PackageJsonService.js";

export const PackageJsonFeature = createFeature({
    name: "Service/PackageJson",
    register(container) {
        container.register(PackageJsonService);
    }
});
