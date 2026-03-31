import { createFeature } from "../../utils/createFeature.js";
import { Logger } from "./abstraction.js";
import { PinoLogger } from "./PinoLogger.js";

interface LoggerFeatureParams {
    logLevel: "debug" | "info" | "warn" | "error";
    json: boolean;
}

export const LoggerFeature = createFeature<LoggerFeatureParams>({
    name: "Base/Logger",
    register(container, params) {
        const logger = new PinoLogger({
            logLevel: params!.logLevel,
            transport: params!.json ? "json" : "pretty"
        });
        container.registerInstance(Logger, logger);
    }
});
