# UpWebiny

Pins all `@webiny/*` packages in a project's `package.json` to a given target version in a single operation. It also normalises placement — any `@webiny/*` packages found in `devDependencies` or `peerDependencies` are moved to `dependencies`, correcting a placement bug present in Webiny 6.0.0. The result is written back to disk via `PackageJsonTool`.

## API

| Export               | Kind              | Description                                                         |
| -------------------- | ----------------- | ------------------------------------------------------------------- |
| `UpWebiny`           | abstraction token | DI token for the tool; resolved to call `execute` / `reconcile`.    |
| `UpWebiny.Interface` | type              | `{ execute(params: Params): void; reconcile(): void }`              |
| `UpWebiny.Params`    | type              | `{ version: Version }` — the target version to pin all packages to. |
| `UpWebinyFeature`    | feature           | Registers the concrete `UpWebinyImpl` against the `UpWebiny` token. |

## Usage

```ts
import { UpWebiny, UpWebinyFeature } from "./tool/UpWebiny/index.js";
import { Version } from "../../base/Version/index.js";

container.use(UpWebinyFeature);

const upWebiny = container.resolve(UpWebiny);

upWebiny.execute({ version: Version.create("6.1.0") });
// All @webiny/* packages are now pinned to 6.1.0 in dependencies
```

## Skipped packages

`@webiny/di`, `@webiny/stdlib`, and `@webiny/wts-client` are independently versioned and excluded from `execute()`. After install, call `reconcile()` to pin them to the versions specified in `references.json` (via `ReferencesService`).
