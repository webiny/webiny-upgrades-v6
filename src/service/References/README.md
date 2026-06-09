# References

Reads the `references.json` file bundled with `@webiny/cli` to expose the canonical package versions that the upgrade framework expects. Upgrade scripts use this service to look up the expected version of a third-party dependency (e.g. React, TypeScript) so they can pin it correctly or check for drift via `DependencyGuard`.

## API

| Export                                   | Kind              | Description                                                                         |
| ---------------------------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| `ReferencesService`                      | abstraction token | DI token for the service; resolved to call `getReference` / `getVersion`.           |
| `ReferencesService.Interface`            | type              | `{ getReference(name): IReference \| null; getVersion(name): string \| null }`      |
| `ReferencesService.Reference`            | type              | Full reference shape: `{ name, versions: ReferenceVersion[] }`.                     |
| `ReferencesService.ReferenceVersion`     | type              | `{ version: string; files: ReferenceVersionFile[] }`                                |
| `ReferencesService.ReferenceVersionFile` | type              | `{ file: string; types: PackageType[] }` — which dep sections a version applies to. |
| `ReferencesService.PackageType`          | enum              | `dependencies \| devDependencies \| peerDependencies \| resolutions`                |
| `ReferencesFeature`                      | feature           | Registers the concrete `ReferencesService` implementation.                          |
| `ReferencesFileMissingError`             | error             | Thrown when `references.json` cannot be found on disk.                              |
| `ReferencesFileInvalidError`             | error             | Thrown when `references.json` cannot be parsed as valid JSON.                       |

### clearCache

Call `clearCache()` to discard the in-memory copy of `references.json` so the next `getReference` / `getVersion` call re-reads the file from disk. This is needed after `packageManager.install()` updates `node_modules`.

## Usage

```ts
import { ReferencesFeature, ReferencesService } from "./service/References/index.js";

container.use(ReferencesFeature);

const refs = container.resolve(ReferencesService);

// Get the canonical version string for a package
const version = refs.getVersion("react"); // e.g. "18.3.1"

// Get the full reference entry with file-level granularity
const ref = refs.getReference("typescript");
```
