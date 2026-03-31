import { createFeature } from "../../utils/createFeature.js";
import { Git } from "./GitService.js";

export const GitFeature = createFeature({
    name: "Service/Git",
    register(container) {
        container.register(Git);
    }
});
