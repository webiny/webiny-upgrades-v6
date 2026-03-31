import { createFeature } from "../../utils/createFeature.js";
import { UpWebiny } from "./UpWebiny.js";

export const UpWebinyFeature = createFeature({
    name: "Tool/UpWebiny",
    register(container) {
        container.register(UpWebiny);
    }
});
