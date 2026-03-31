import type { Container as DIContainer } from "@webiny/di";
import { createFeature } from "../../utils/createFeature.js";
import { Container } from "./abstraction.js";

export const ContainerFeature = createFeature({
    name: "Base/Container",
    register(container: DIContainer) {
        container.registerInstance(Container, container);
    }
});
