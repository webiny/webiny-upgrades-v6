import pino from "pino";
import { Logger } from "./abstraction.js";

const customLevels = {
    success: 35,
    warning: 45
} as const;

interface PinoLoggerParams {
    debug: boolean;
}

export class PinoLogger implements Logger.Interface {
    private readonly logger: pino.Logger<keyof typeof customLevels>;

    public constructor(params: PinoLoggerParams) {
        this.logger = pino<keyof typeof customLevels>({
            customLevels,
            useOnlyCustomLevels: false,
            level: params.debug ? "debug" : "success",
            transport: {
                target: "pino-pretty",
                options: {
                    colorize: true,
                    customLevels: "success:35,warning:45",
                    customColors: "success:green,warning:yellow,error:red,debug:gray",
                    useOnlyCustomLevels: false,
                    ignore: "pid,hostname,time",
                    messageFormat: "{msg}"
                }
            }
        });
    }

    public debug(message: string, ...args: unknown[]): void {
        this.logger.debug(message, ...(args as any[]));
    }

    public success(message: string, ...args: unknown[]): void {
        this.logger.success(message, ...(args as any[]));
    }

    public warning(message: string, ...args: unknown[]): void {
        this.logger.warning(message, ...(args as any[]));
    }

    public error(message: string, ...args: unknown[]): void {
        this.logger.error(message, ...(args as any[]));
    }
}
