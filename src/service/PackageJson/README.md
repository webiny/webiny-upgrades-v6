# PackageJson

Provides read/write access to `package.json` files. The service loads a file from disk, exposes typed getters and setters for all four dependency sections (`dependencies`, `devDependencies`, `peerDependencies`, `resolutions`) as well as arbitrary top-level keys, and writes the mutated file back to disk. It is the low-level foundation used by `PackageJsonTool` (the context-aware wrapper) and `UpWebiny`.

## API

| Export | Kind | Description |
|---|---|---|
| `PackageJsonService` | abstraction token | DI token for the service (`load`, `loadOrThrow`, `save`). |
| `PackageJsonService.Interface` | type | Service contract. |
| `PackageJsonService.File` | type | Alias for `PackageJsonFile.Interface`. |
| `PackageJsonFile` | abstraction token | DI token for a single parsed `package.json` instance. |
| `PackageJsonFile.Interface` | type | Full mutation interface (see methods below). |
| `PackageJsonFile.Data` | type | Raw `package.json` object (re-exported from `type-fest`). |
| `PackageJsonFile.Dependencies` / `DevDependencies` / `PeerDependencies` / `Resolutions` | types | Typed maps for each dependency section. |
| `PackageJsonLoadError` | error | Thrown by `loadOrThrow` when a file cannot be read; carries the bad `path`. |
| `PackageJsonFeature` | feature | Registers `PackageJsonService` into the DI container. |

### `PackageJsonFile.Interface` methods (per section, shown for `dependencies`)

| Method | Description |
|---|---|
| `getDependencies()` | Returns all entries in the section. |
| `getDependency(name)` | Returns the version string or `null`. |
| `setDependency(name, version)` | Adds or updates the entry. |
| `setDependencyIfExists(name, version)` | Updates only when the entry is already present. |
| `removeDependency(name)` | Deletes the entry. |

The same pattern applies to `DevDependency`, `PeerDependency`, and `Resolution` variants. Additionally: `getVersion()` reads the top-level `version` field; `get(key)` / `set(key, value)` access arbitrary top-level keys.

## Usage

```ts
import { PackageJsonFeature, PackageJsonService } from "./service/PackageJson/index.js";

container.use(PackageJsonFeature);

const svc = container.resolve(PackageJsonService);

const file = svc.loadOrThrow("/path/to/package.json");
file.setDependency("react", "18.3.1");
svc.save(file);
```
