import { createFeature } from "../../utils/createFeature.js";
import type { IReference } from "./abstractions.js";
import { ReferencesService as ReferencesServiceAbstraction } from "./abstractions.js";
import { ReferencesService } from "./ReferencesService.js";

interface IReferencesParams {
    references: IReference[];
}

export const ReferencesFeature = createFeature<IReferencesParams>({
    name: "Service/References",
    register(container, params) {
        container.registerInstance(
            ReferencesServiceAbstraction,
            new ReferencesService(params.references)
        );
    }
});
