import { createFeature } from "../../utils/createFeature.js";
import { Application } from "./Application.js";

export const ApplicationFeature = createFeature({
    name: "Base/Application",
    register(container) {
        container.register(Application);
    }
});
