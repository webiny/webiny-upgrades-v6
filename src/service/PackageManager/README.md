# PackageManager

Detects and wraps the project's package manager (npm, yarn, or pnpm) behind a unified interface, providing install, version query, and update operations used throughout the upgrade framework. Detection is automatic — it inspects the working directory for a lock file (`yarn.lock`, `pnpm-lock.yaml`, `package-lock.json`) and selects the correct implementation — or accepts an override via `--package-manager`. All operations are timed and logged via the shared `Timer` and `Logger` services.

## API

| Export                         | Kind                         | Description                                                                                                                         |
| ------------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `PackageManagerService`        | abstraction + implementation | High-level service that delegates to the detected package manager; primary entry point for upgrade scripts.                         |
| `PackageManagerName`           | abstraction                  | DI token that holds the detected package manager name (`"yarn" \| "pnpm" \| "npm"`).                                                |
| `PackageManagerFeature`        | feature                      | DI feature that auto-detects the package manager, registers `PackageManagerService`, and binds the correct concrete implementation. |
| `PackageManagerDetectionError` | error class                  | Thrown when no lock file is found and no `--package-manager` override was provided.                                                 |

## Usage

```ts
import { PackageManagerFeature, PackageManagerService } from "./service/PackageManager/index.js";

// During container setup
container.use(PackageManagerFeature);

// Inside an upgrade step
const pm = container.resolve(PackageManagerService);

console.log(pm.name()); // "yarn" | "pnpm" | "npm"
console.log(await pm.version()); // Version instance

await pm.install(); // runs install with stdio inherited
await pm.update("10.9.0"); // updates the package manager itself to a specific version
```
