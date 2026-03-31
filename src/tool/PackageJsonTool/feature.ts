import { createFeature } from "../../utils/createFeature.js";
import { PackageJsonTool } from "./PackageJsonTool.js";

export const PackageJsonToolFeature = createFeature({
    name: "Tool/PackageJsonTool",
    register(container) {
        container.register(PackageJsonTool);
    }
});
