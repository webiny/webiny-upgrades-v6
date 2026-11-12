# References

Holds the `references.json` of the Webiny version being installed and exposes the canonical package versions that the upgrade framework expects. Upgrade scripts use this service to look up the expected version of a third-party dependency (e.g. React, TypeScript) so they can pin it correctly or check for drift via `DependencyGuard`.

`loadReferences()` fetches the file from the registry while the container is built, before any upgrade runs. It reads the tarball of the version being installed (`--install-version` when set, otherwise the target version) and tries two packages in order:

1. `@webiny/dependency-versions`, `references.json` (published from 6.6.0)
2. `@webiny/cli`, `files/references.json` (up to 6.5)

The first package that has the version wins. `node_modules` is not involved, so the file is the same before and after the install. If neither package has the file, the upgrade stops before it changes anything.

## API

| Export                                   | Kind              | Description                                                                                                      |
| ---------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| `ReferencesService`                      | abstraction token | DI token for the service; resolved to call `getReference` / `getVersion`.                                        |
| `ReferencesService.Interface`            | type              | `{ getReference(name): IReference \| null; getVersion(name): string \| null }`                                   |
| `ReferencesService.Reference`            | type              | Full reference shape: `{ name, versions: ReferenceVersion[] }`.                                                  |
| `ReferencesService.ReferenceVersion`     | type              | `{ version: string; files: ReferenceVersionFile[] }`                                                             |
| `ReferencesService.ReferenceVersionFile` | type              | `{ file: string; types: PackageType[] }` — which dep sections a version applies to.                              |
| `ReferencesService.PackageType`          | enum              | `dependencies \| devDependencies \| peerDependencies \| resolutions`                                             |
| `loadReferences`                         | function          | `({ registry, version }) => Promise<Reference[]>` — reads `references.json` of `version` from the registry.      |
| `ReferencesFeature`                      | feature           | Registers a `ReferencesService` over the references passed as `{ references }`.                                  |
| `ReferencesFileMissingError`             | error             | Thrown by `loadReferences` when neither package has the file for the version. `sources` lists both.              |
| `ReferencesFileInvalidError`             | error             | Thrown by `loadReferences` when the file is not valid JSON or has no `references`. `source` names the file read. |

## Usage

```ts
import {
  loadReferences,
  ReferencesFeature,
  ReferencesService
} from "./service/References/index.js";
import { RegistryService } from "./service/Registry/index.js";

const references = await loadReferences({
  registry: container.resolve(RegistryService),
  version: Version.create("6.6.0")
});
ReferencesFeature.register(container, { references });

const refs = container.resolve(ReferencesService);

// Get the canonical version string for a package
const version = refs.getVersion("react"); // e.g. "18.3.1"

// Get the full reference entry with file-level granularity
const ref = refs.getReference("typescript");
```
