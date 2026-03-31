import { Responder as ResponderAbstraction } from "./abstraction.js";
import { Logger } from "../Logger/index.js";

class ProcessResponderImpl implements ResponderAbstraction.Interface {
    public constructor(private readonly logger: Logger.Interface) {}

    public success(duration: number, message?: string): never {
        this.logger.done(message || `Upgrade completed in ${duration}s.`);
        process.exit(0);
    }

    public error(message: string, duration: number, error?: Error): never {
        this.logger.error(message);
        if (error?.stack) {
            this.logger.debug(error.stack);
        }
        this.logger.fatal(`Upgrade failed in ${duration}s.`);
        process.exit(1);
    }
}

export const Responder = ResponderAbstraction.createImplementation({
    implementation: ProcessResponderImpl,
    dependencies: [Logger]
});
