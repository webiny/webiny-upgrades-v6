# DependencyGuard

Scans a project's `package.json` (across `dependencies`, `devDependencies`, `peerDependencies`, and `resolutions`) and compares each non-Webiny, non-skipped package version against the canonical versions recorded in the upgrade framework's `references.json`. It returns every version mismatch it finds, giving upgrade scripts a way to detect and surface third-party dependency drift before or after applying changes.

## API

| Export                      | Kind              | Description                                                                                       |
| --------------------------- | ----------------- | ------------------------------------------------------------------------------------------------- |
| `DependencyGuard`           | abstraction token | DI token and namespace for the guard; resolves to a `DependencyGuard.Interface` instance.         |
| `DependencyGuard.Interface` | type              | Contract for the guard: a single `execute()` method returning an array of mismatches.             |
| `DependencyGuard.Mismatch`  | type              | Shape of a single version mismatch: `{ name, userVersion, expectedVersion }`.                     |
| `DependencyGuardFeature`    | feature           | DI feature that registers the concrete `DependencyGuardImpl` against the `DependencyGuard` token. |

## Usage

```ts
import { DependencyGuard, DependencyGuardFeature } from "./tool/DependencyGuard/index.js";

// Register the feature when building your container
container.use(DependencyGuardFeature);

const guard = container.resolve(DependencyGuard);
const mismatches = guard.execute();

if (mismatches.length > 0) {
  for (const m of mismatches) {
    console.warn(`${m.name}: found ${m.userVersion}, expected ${m.expectedVersion}`);
  }
}
```

Pass `skipDependencyGuard: true` on the `Input` service to short-circuit the check and always return an empty array.
