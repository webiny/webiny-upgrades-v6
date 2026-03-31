import { describe, it, expect, vi } from "vitest";
import { Container } from "@webiny/di";
import { Timer as TimerToken } from "./abstraction.js";
import { Timer } from "./Timer.js";
import { Logger } from "../Logger/abstraction.js";
import { createMockLogger } from "../../__tests__/utils/mockLogger.js";

const createContainer = () => {
    const container = new Container();
    const logger = createMockLogger();
    container.registerInstance(Logger, logger);
    container.register(Timer);
    return { container, logger };
};

describe("Timer", () => {
    it("returns the callback result", async () => {
        const { container } = createContainer();
        const timer = container.resolve(TimerToken);

        const { result } = await timer.execute("test", async () => 42);

        expect(result).toBe(42);
    });

    it("result includes startAt, endAt, and duration", async () => {
        const { container } = createContainer();
        const timer = container.resolve(TimerToken);

        const before = new Date();
        const timerResult = await timer.execute("test", async () => null);
        const after = new Date();

        expect(timerResult.startAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(timerResult.endAt.getTime()).toBeGreaterThanOrEqual(timerResult.startAt.getTime());
        expect(timerResult.endAt.getTime()).toBeLessThanOrEqual(after.getTime());
        expect(timerResult.duration).toBe(
            timerResult.endAt.getTime() - timerResult.startAt.getTime()
        );
    });

    it("logs debug on start and end", async () => {
        const { container, logger } = createContainer();
        const timer = container.resolve(TimerToken);

        await timer.execute("my-op", async () => undefined);

        expect(logger.debug).toHaveBeenCalledTimes(2);
        expect(vi.mocked(logger.debug).mock.calls[0][0]).toContain("my-op");
        expect(vi.mocked(logger.debug).mock.calls[1][0]).toContain("my-op");
    });

    it("rethrows when the callback throws", async () => {
        const { container } = createContainer();
        const timer = container.resolve(TimerToken);

        await expect(
            timer.execute("failing", async () => {
                throw new Error("cb failed");
            })
        ).rejects.toThrow("cb failed");
    });
});
