import { createFeature } from "~/utils/createFeature.js";
import { Yarn } from "./Yarn.js";

export const YarnFeature = createFeature({
    name: "Service/Yarn",
    register(container) {
        container.register(Yarn);
    }
});
