# UpgradeHandler

Orchestrates the full upgrade lifecycle for a Webiny project. Given a target version, it guards against a dirty git repository, builds a pool of applicable `Upgrade` steps (filtered by `canHandle`, history, and optional force/dry-run flags), executes them in order, advances the tracked current version after each step, pins all `@webiny/*` packages to the target version, and runs the package manager install. On any step failure the service rolls back via `git.restore` before rethrowing.

## API

| Export | Kind | Description |
|---|---|---|
| `UpgradeHandler` | abstraction token | DI token and namespace for `Interface` / `Params`. |
| `UpgradeHandler.Interface` | type | Contract: `handle(params: Params): Promise<void>`. |
| `UpgradeHandler.Params` | type | `{ version: Version }` — the target upgrade version. |
| `UpgradeHandlerFeature` | DI feature | Registers the concrete `UpgradeHandlerImpl` into a DI container. |
| `DirtyGitRepositoryError` | error class | Thrown when the git working tree has uncommitted changes at the start of `handle`. |

## Usage

```ts
import { UpgradeHandler, UpgradeHandlerFeature } from "./service/UpgradeHandler/index.js";
import { Version } from "../../base/Version/index.js";

container.use(UpgradeHandlerFeature);

const handler = container.resolve(UpgradeHandler);
await handler.handle({ version: Version.create("6.2.0") });
```

Pass `Input.dryRun = true` to preview which upgrades would run without executing them. Pass `Input.forceUpgrade = true` to re-run all upgrades between the current and target version regardless of history.
