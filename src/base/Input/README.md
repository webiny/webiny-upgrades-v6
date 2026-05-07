# Input

Holds the parsed CLI arguments for the current upgrade run. It is registered into the DI container once at startup so that any service or upgrade step can declare it as a dependency and read flags without having direct access to `process.argv`.

## API

| Export | Kind | Description |
|---|---|---|
| `Input` | abstraction token | DI token for the input object; resolved to read CLI flags. |
| `Input.Interface` | type | Full shape of the parsed input (see fields below). |
| `InputFeature` | feature | Registers the `Input` instance into the container. |

### `Input.Interface` fields

| Field | Type | Description |
|---|---|---|
| `cwd` | `string` | Working directory of the project being upgraded. |
| `registry` | `string` | npm registry URL for version queries. |
| `version` | `string` | Target version string from the CLI. |
| `logLevel` | `"debug" \| "info" \| "warn" \| "error"` | Minimum log level to emit. |
| `json` | `boolean` | Emit machine-readable JSON log lines instead of pretty output. |
| `forceUpgrade` | `boolean` | Re-run all upgrades regardless of history. |
| `packageManager` | `"yarn" \| "pnpm" \| "npm" \| undefined` | Override auto-detected package manager. |
| `skipDependencyGuard` | `boolean` | Skip the post-upgrade dependency mismatch check. |
| `dryRun` | `boolean` | Preview which steps would run without executing them. |
| `installVersion` | `string \| undefined` | Pin the package manager install to a specific version. |

## Usage

```ts
import { Input } from "./base/Input/index.js";

const input = container.resolve(Input);

if (input.dryRun) {
    logger.info("Dry-run mode — no changes will be applied.");
}
```
