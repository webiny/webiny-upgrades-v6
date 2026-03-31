import { describe, it, expect } from "vitest";
import { PinoLogger } from "./PinoLogger.js";

describe("PinoLogger", () => {
    it("does not throw when using pretty transport", () => {
        const logger = new PinoLogger({ logLevel: "error", transport: "pretty" });
        expect(() => logger.done("finished")).not.toThrow();
    });

    it("does not throw when using json transport", () => {
        const logger = new PinoLogger({ logLevel: "error", transport: "json" });
        expect(() => logger.done("finished")).not.toThrow();
    });
});
