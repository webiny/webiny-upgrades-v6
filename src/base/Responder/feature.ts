import { createFeature } from "../../utils/createFeature.js";
import { Responder } from "./ProcessResponder.js";

export const ResponderFeature = createFeature({
    name: "Base/Responder",
    register(container) {
        container.register(Responder);
    }
});
