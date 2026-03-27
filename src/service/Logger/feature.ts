import { createFeature } from "~/utils/createFeature.js";
import { Logger } from "./abstraction.js";
import { PinoLogger } from "./PinoLogger.js";

interface LoggerFeatureParams {
    debug: boolean;
}

export const LoggerFeature = createFeature<LoggerFeatureParams>({
    name: "Service/Logger",
    register(container, params) {
        container.registerInstance(
            Logger,
            new PinoLogger({
                debug: params?.debug || false
            })
        );
    }
});
