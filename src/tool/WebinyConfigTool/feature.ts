import { createFeature } from "../../utils/createFeature.js";
import { WebinyConfigTool } from "./WebinyConfigTool.js";

export const WebinyConfigToolFeature = createFeature({
    name: "Tool/WebinyConfigTool",
    register(container) {
        container.register(WebinyConfigTool);
    }
});
