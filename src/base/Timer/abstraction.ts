import { createAbstraction } from "../../utils/createAbstraction.js";

interface ITimerResult<T> {
    result: T;
    startAt: Date;
    endAt: Date;
    duration: number;
}

interface ITimer {
    execute<T>(name: string, cb: () => Promise<T>): Promise<ITimerResult<T>>;
}

export const Timer = createAbstraction<ITimer>("Timer");

export namespace Timer {
    export type Interface = ITimer;
    export type Result<T> = ITimerResult<T>;
}
