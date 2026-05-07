# Upgrade

Defines the interface that every versioned upgrade step must implement. Each upgrade declares the version it targets and a `canHandle` predicate that the framework evaluates to decide whether the step should run for a given `currentVersion` / `targetVersion` pair. Steps are registered into the DI container and collected by `UpgradeHandler` at runtime.

## API

| Export | Kind | Description |
|---|---|---|
| `Upgrade` | abstraction token | DI token for upgrade steps; multiple implementations are collected via multi-injection. |
| `Upgrade.Interface` | type | Contract: `version`, `canHandle(params)`, `execute()`. |
| `Upgrade.Params` | type | `{ targetVersion: Version; currentVersion: Version }` — passed to `canHandle`. |

### `Upgrade.Interface` members

| Member | Description |
|---|---|
| `version` | The `Version` this step upgrades to. |
| `canHandle(params)` | Returns `true` when this step should run given the current progress and target. Typically implemented with `this.version.between(params.currentVersion, params.targetVersion)`. |
| `execute()` | Applies the upgrade mutations (file edits, dependency changes, etc.). |

## Usage

```ts
import { Upgrade } from "../../base/Upgrade/index.js";
import { Version } from "../../base/Version/index.js";

class MyUpgradeStep implements Upgrade.Interface {
    readonly version = Version.create("6.1.0");

    async canHandle({ currentVersion, targetVersion }: Upgrade.Params) {
        return this.version.between(currentVersion, targetVersion);
    }

    async execute() {
        // apply changes for 6.1.0
    }
}
```
