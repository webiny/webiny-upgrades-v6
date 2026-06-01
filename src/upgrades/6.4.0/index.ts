import { createFeature } from "../../utils/createFeature.js";
import { Upgrade } from "./Upgrade.js";

export default createFeature({
    name: "Upgrade 6.4.0",
    register(container) {
        container.register(Upgrade);
    }
});
