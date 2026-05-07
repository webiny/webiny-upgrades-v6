# Registry

Queries an npm-compatible package registry (defaulting to `https://registry.npmjs.org`) to resolve package versions during the upgrade process. It is used by upgrade scripts to determine the latest published version of a package or to verify that a specific version exists before proceeding.

## API

| Export                          | Kind                   | Description                                                                                                             |
| ------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `RegistryService`               | abstraction / DI token | Interface and DI token for the registry service; resolved from the container to call `getLatestVersion` / `getVersion`. |
| `RegistryService.Interface`     | type                   | TypeScript interface declaring the two registry methods.                                                                |
| `RegistryFeature`               | feature                | DI feature that registers the concrete `RegistryService` implementation into the container.                             |
| `LatestVersionUnavailableError` | error class            | Thrown when the latest version of a package cannot be fetched from the registry.                                        |
| `VersionNotFoundError`          | error class            | Thrown when a specific version of a package does not exist in the registry.                                             |

## Usage

```ts
import { RegistryFeature, RegistryService } from "./service/Registry/index.js";

// Register the feature when building your container
container.use(RegistryFeature);

const registry = container.resolve(RegistryService);

// Fetch the latest published version of a package
const latest = await registry.getLatestVersion("@webiny/cli");
console.log(latest.format()); // e.g. "6.1.0"

// Check that a specific version exists
const found = await registry.getVersion("@webiny/cli", "6.0.0");
```
