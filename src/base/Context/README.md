# Context

Holds the runtime context for an upgrade run — the working directory, registry URL, and the three version tracking fields (`installedVersion`, `targetVersion`, `currentVersion`). `currentVersion` starts as `installedVersion` and is advanced by `UpgradeHandler` after each step executes, giving upgrade scripts a consistent view of how far the run has progressed.

## API

| Export              | Kind              | Description                                                                                                                                               |
| ------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Context`           | abstraction token | DI token for the context object; resolved by any service that needs run-time path or version data.                                                        |
| `Context.Interface` | type              | Full interface: `cwd`, `registry`, `inputVersion`, `targetVersion`, `installedVersion`, `currentVersion`, `setCurrentVersion(v)`, `resolve(...segments)`. |
| `ContextFeature`    | feature           | Registers a `Context` instance into the container.                                                                                                        |

### `Context.Interface` members

| Member                 | Description                                                   |
| ---------------------- | ------------------------------------------------------------- |
| `cwd`                  | Absolute path to the project being upgraded.                  |
| `registry`             | npm-compatible registry URL used for version queries.         |
| `inputVersion`         | Raw version string received from the CLI.                     |
| `targetVersion`        | Parsed `Version` the run is upgrading to.                     |
| `installedVersion`     | `Version` read from `node_modules` at startup; never changes. |
| `currentVersion`       | Logical progress cursor; advances after each step.            |
| `setCurrentVersion(v)` | Advances `currentVersion` — called by `UpgradeHandler`.       |
| `resolve(...segments)` | Resolves path segments relative to `cwd`.                     |

## Usage

```ts
import { Context } from "./base/Context/index.js";

const ctx = container.resolve(Context);

const filePath = ctx.resolve("webiny.config.tsx");
console.log(ctx.currentVersion.format()); // e.g. "6.1.0"
```
