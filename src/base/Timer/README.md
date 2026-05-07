# Timer

Wraps async operations with timing instrumentation. Each call to `execute` records start/end timestamps and computes duration, logging both events at `debug` level via `Logger`. The result value and timing metadata are returned together so callers can log or display elapsed time without implementing their own boilerplate.

## API

| Export            | Kind              | Description                                                                                    |
| ----------------- | ----------------- | ---------------------------------------------------------------------------------------------- |
| `Timer`           | abstraction token | DI token for the timer service.                                                                |
| `Timer.Interface` | type              | `{ execute<T>(name: string, cb: () => Promise<T>): Promise<Timer.Result<T>> }`                 |
| `Timer.Result<T>` | type              | `{ result: T; startAt: Date; endAt: Date; duration: number }` — `duration` is in milliseconds. |
| `TimerFeature`    | feature           | Registers the `TimerImpl` against the `Timer` token; depends on `Logger`.                      |

## Usage

```ts
import { Timer, TimerFeature } from "./base/Timer/index.js";

container.use(TimerFeature);

const timer = container.resolve(Timer);

const { result, duration } = await timer.execute("install packages", async () => {
  return await packageManager.install();
});

logger.info(`Install completed in ${duration / 1000}s`);
```
