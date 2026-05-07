# UpgradeRunner

Discovers, loads, and executes versioned upgrade scripts in order. It scans the upgrades directory for version-named subdirectories (e.g. `5.40.0/`), sorts them by semantic version, dynamically imports each `index.ts` as a feature that registers its steps into the DI container, and then delegates execution to `UpgradeHandler`. This is the top-level orchestrator that drives the full upgrade pipeline for a given target version.

## API

| Export                           | Kind                         | Description                                                                               |
| -------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------- |
| `UpgradeRunner`                  | abstraction + implementation | Core service; call `.run()` to execute all upgrade scripts in version order.              |
| `UpgradeRunner.Interface`        | type                         | Contract: `{ run(): Promise<void> }`                                                      |
| `UpgradeRunnerFeature`           | feature                      | DI feature that registers `UpgradeRunner` and the default `UpgradesDirectory` path.       |
| `UpgradesDirectory`              | abstraction token            | String token resolving to the path where versioned upgrade directories live.              |
| `UpgradeFeatureExportError`      | error                        | Thrown when a versioned `index.ts` does not export a valid feature as its default export. |
| `UpgradeIndexMissingError`       | error                        | Thrown when a versioned upgrade directory is missing its `index.ts` entry point.          |
| `UpgradesDirectoryEmptyError`    | error                        | Thrown when the upgrades directory exists but contains no versioned subdirectories.       |
| `UpgradesDirectoryNotFoundError` | error                        | Thrown when the upgrades directory path does not exist on disk.                           |

## Usage

```ts
import { UpgradeRunner, UpgradeRunnerFeature } from "./service/UpgradeRunner/index.js";

// Register the feature into your DI container
container.use(UpgradeRunnerFeature);

const runner = container.resolve(UpgradeRunner);
await runner.run();
```

To override the upgrades directory (e.g. in tests):

```ts
import { UpgradesDirectory } from "./service/UpgradeRunner/index.js";

container.registerInstance(UpgradesDirectory, "/path/to/custom/upgrades");
```
