# YarnrcGuard

Checks that the project's `.yarnrc.yml` contains required security settings (`approvedGitRepositories`, `enableScripts`, `npmMinimalAgeGate`, `npmPreapprovedPackages`). The guard is version-gated: when `targetVersion` is below `breakOnVersion` it logs informational messages about missing settings; when at or above `breakOnVersion` it throws a `YarnrcGuardError` to abort the upgrade.

See https://www.webiny.com/docs/infrastructure/yarnrc-security.md for details on each setting.

## API

| Export                  | Kind              | Description                                                                                   |
| ----------------------- | ----------------- | --------------------------------------------------------------------------------------------- |
| `YarnrcGuard`           | abstraction token | DI token and namespace for the guard; resolves to a `YarnrcGuard.Interface` instance.         |
| `YarnrcGuard.Interface` | type              | Contract for the guard: `execute(params)` that either returns silently, logs info, or throws. |
| `YarnrcGuard.Params`    | type              | Shape of the execute params: `{ targetVersion: Version, breakOnVersion: Version }`.           |
| `YarnrcGuardFeature`    | feature           | DI feature that registers the concrete `YarnrcGuardImpl` against the `YarnrcGuard` token.     |
| `YarnrcGuardError`      | error class       | Thrown when required settings are missing and `targetVersion >= breakOnVersion`.              |

## Usage

```ts
import { YarnrcGuard, YarnrcGuardFeature } from "./tool/YarnrcGuard/index.js";
import { Version } from "./base/Version/index.js";

// Register the feature when building your container
container.use(YarnrcGuardFeature);

const guard = container.resolve(YarnrcGuard);
guard.execute({
  targetVersion: Version.create("6.5.0"),
  breakOnVersion: Version.create("6.5.0")
});
// Throws YarnrcGuardError if any required setting is missing in .yarnrc.yml
```

## Behaviour

| Condition                                           | Result                                                 |
| --------------------------------------------------- | ------------------------------------------------------ |
| All four settings present                           | Returns silently                                       |
| Missing settings, `targetVersion < breakOnVersion`  | Logs each missing setting via `logger.info`            |
| Missing settings, `targetVersion >= breakOnVersion` | Throws `YarnrcGuardError` listing all missing settings |
| `.yarnrc.yml` does not exist                        | Treated as all four settings missing                   |
| `.yarnrc.yml` is empty or not a valid YAML object   | Treated as all four settings missing                   |
