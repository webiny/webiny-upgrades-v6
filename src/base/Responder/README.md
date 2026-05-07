# Responder

Handles terminal upgrade responses by logging a success or failure message and immediately exiting the process. It is the single exit point for every upgrade run — `success` terminates with `process.exit(0)` and `error` terminates with `process.exit(1)`, ensuring the CLI always returns a meaningful exit code regardless of how control reaches the end of an upgrade script.

## API

| Export                | Kind              | Description                                                                                                                 |
| --------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `Responder`           | abstraction token | DI token and namespace for the `IResponder` interface; resolved by consumers to call `success` or `error`.                  |
| `Responder.Interface` | type              | Interface satisfied by any Responder implementation (`success(duration, message?)` and `error(message, duration, error?)`). |
| `ResponderFeature`    | DI feature        | Registers `ProcessResponder` as the concrete implementation of `Responder` in a DI container.                               |

### `ProcessResponder` methods

| Method    | Signature                                                   | Behaviour                                                                                                                                          |
| --------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `success` | `(duration: number, message?: string): never`               | Logs a completion message via `logger.done`, then calls `process.exit(0)`.                                                                         |
| `error`   | `(message: string, duration: number, error?: Error): never` | Logs the message via `logger.error`, optionally logs the stack trace via `logger.debug`, logs a fatal duration line, then calls `process.exit(1)`. |

## Usage

```ts
import { ResponderFeature, Responder } from "./base/Responder/index.js";

// Register when bootstrapping
const app = createApplication({
  features: [ResponderFeature()]
});

const responder = container.resolve(Responder);

// On success — exits with code 0
responder.success(duration);

// On failure — exits with code 1
responder.error("Upgrade failed: missing config", duration, caughtError);
```
