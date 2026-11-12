# Registry

Queries an npm-compatible package registry (defaulting to `https://registry.npmjs.org`) during the upgrade process. It resolves the latest published version of a package, verifies that a specific version exists, and reads single files out of a published version's tarball.

## API

| Export                          | Kind                   | Description                                                                                                                         |
| ------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `RegistryService`               | abstraction / DI token | Interface and DI token for the registry service; resolved from the container to call `getLatestVersion` / `getVersion` / `getFile`. |
| `RegistryService.Interface`     | type                   | TypeScript interface declaring the three registry methods.                                                                          |
| `RegistryFeature`               | feature                | DI feature that registers the concrete `RegistryService` implementation into the container.                                         |
| `LatestVersionUnavailableError` | error class            | Thrown when the latest version of a package cannot be fetched from the registry.                                                    |
| `VersionNotFoundError`          | error class            | Thrown when a specific version of a package does not exist in the registry.                                                         |

`getFile(name, version, filePath)` downloads the version's tarball and returns the file at `filePath`, relative to the package root, as a string. It returns null when the package, the version or the file doesn't exist, or when the download fails. A package that isn't published returns null without a warning, the same as a version that isn't.

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

// Read one file from a published version
const json = await registry.getFile("@webiny/cli", "6.5.0", "files/references.json");
```
