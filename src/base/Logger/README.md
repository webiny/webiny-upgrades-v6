# Logger

Provides structured logging for the upgrade framework via a DI-registered abstraction backed by [pino](https://github.com/pinojs/pino). Upgrade scripts resolve the `Logger` token from the container and call its methods; the concrete implementation and output format (human-readable pretty-print or machine-readable JSON) are configured once at framework startup through `LoggerFeature`.

## API

| Export | Kind | Description |
|---|---|---|
| `Logger` | abstraction token | DI token used to resolve the logger; also exposes `Logger.Interface` for typing. |
| `Logger.Interface` | type | Interface with `debug`, `info`, `warn`, `error`, `fatal`, and `done` methods. |
| `LoggerFeature` | feature | Registers a `PinoLogger` instance into the container; accepts `logLevel` and `json` params. |
| `PinoLogger` | class | Concrete pino-backed implementation of `Logger.Interface`; supports `pretty` and `json` transports. |

## Usage

```ts
import { Logger, LoggerFeature } from "./base/Logger/index.js";

// 1. Register the feature when bootstrapping the framework
const app = createApplication({
    features: [
        LoggerFeature({ logLevel: "info", json: false })
    ]
});

// 2. Resolve and use the logger inside an upgrade script or service
const logger = container.resolve(Logger);

logger.info("Starting upgrade step...");
logger.warn("Deprecated config key found: %s", key);
logger.error("Failed to patch file: %s", filePath);
logger.done("Upgrade complete.");
```

In `json: true` mode each call emits a single-line JSON object `{ "type": "<level>", "message": "..." }` to stdout — suitable for machine parsing by a parent process. In the default `json: false` mode pino-pretty renders colorized, human-friendly output to the terminal.
