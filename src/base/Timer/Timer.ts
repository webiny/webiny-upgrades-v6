import { Timer as TimerAbstraction } from "./abstraction.js";
import { Logger } from "../Logger/index.js";

class TimerImpl implements TimerAbstraction.Interface {
    public constructor(private readonly logger: Logger.Interface) {}

    public async execute<T>(
        name: string,
        cb: () => Promise<T>
    ): Promise<TimerAbstraction.Result<T>> {
        const startAt = new Date();

        this.logger.debug(`Timer started: ${name} at ${startAt.toISOString()}`);
        const result = await cb();
        const endAt = new Date();
        const duration = endAt.getTime() - startAt.getTime();
        this.logger.debug(
            `Timer ended: ${name} at ${endAt.toISOString()}. Duration: ${duration / 1000}s`
        );
        return {
            result,
            startAt,
            endAt,
            duration
        };
    }
}

export const Timer = TimerAbstraction.createImplementation({
    implementation: TimerImpl,
    dependencies: [Logger]
});
