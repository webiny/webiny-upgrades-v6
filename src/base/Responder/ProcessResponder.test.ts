import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockLogger } from "../../__tests__/utils/mockLogger.js";
import { Responder as ResponderToken } from "./abstraction.js";
import { Container } from "@webiny/di";
import { Logger } from "../Logger/abstraction.js";
import { Responder } from "./ProcessResponder.js";

const createContainer = () => {
    const container = new Container();
    const logger = createMockLogger();
    container.registerInstance(Logger, logger);
    container.register(Responder);
    return { container, logger };
};

describe("ProcessResponder", () => {
    let exitSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
            throw new Error("process.exit called");
        }) as never);
    });

    afterEach(() => {
        exitSpy.mockRestore();
    });

    describe("success", () => {
        it("calls logger.done with a completion message", () => {
            const { container, logger } = createContainer();
            const responder = container.resolve(ResponderToken);

            expect(() => responder.success(1.5)).toThrow("process.exit called");

            expect(logger.done).toHaveBeenCalledOnce();
            expect(vi.mocked(logger.done).mock.calls[0][0]).toContain("1.5s");
        });

        it("exits with code 0", () => {
            const { container } = createContainer();
            const responder = container.resolve(ResponderToken);

            expect(() => responder.success(1)).toThrow("process.exit called");
            expect(exitSpy).toHaveBeenCalledWith(0);
        });
    });

    describe("error", () => {
        it("calls logger.error with the message", () => {
            const { container, logger } = createContainer();
            const responder = container.resolve(ResponderToken);

            expect(() => responder.error("Something went wrong", 2.3)).toThrow(
                "process.exit called"
            );

            expect(logger.error).toHaveBeenCalledWith("Something went wrong");
        });

        it("calls logger.fatal with a failure duration message", () => {
            const { container, logger } = createContainer();
            const responder = container.resolve(ResponderToken);

            expect(() => responder.error("fail", 2.3)).toThrow("process.exit called");

            expect(logger.fatal).toHaveBeenCalledOnce();
            expect(vi.mocked(logger.fatal).mock.calls[0][0]).toContain("2.3s");
        });

        it("exits with code 1", () => {
            const { container } = createContainer();
            const responder = container.resolve(ResponderToken);

            expect(() => responder.error("fail", 1)).toThrow("process.exit called");
            expect(exitSpy).toHaveBeenCalledWith(1);
        });

        it("logs error stack via debug when error is provided", () => {
            const { container, logger } = createContainer();
            const responder = container.resolve(ResponderToken);
            const err = new Error("boom");

            expect(() => responder.error("boom", 1, err)).toThrow("process.exit called");

            expect(logger.debug).toHaveBeenCalledWith(err.stack);
        });
    });
});
