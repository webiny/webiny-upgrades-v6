# PackageJsonTool

A context-aware wrapper around `PackageJsonService` that defaults to loading `package.json` from the project's `cwd` when no explicit path is given. Upgrade scripts use this tool instead of `PackageJsonService` directly so they do not need to resolve the project root themselves.

## API

| Export | Kind | Description |
|---|---|---|
| `PackageJsonTool` | abstraction token | DI token for the tool (`load`, `loadOrThrow`, `save`). |
| `PackageJsonTool.Interface` | type | `{ load(target?): File \| null; loadOrThrow(target?): File; save(file): void }` |
| `PackageJsonTool.File` | type | Alias for `PackageJsonService.File` (the mutable file object). |
| `PackageJsonToolFeature` | feature | Registers the concrete `PackageJsonToolImpl` into the DI container. |

## Usage

```ts
import { PackageJsonTool, PackageJsonToolFeature } from "./tool/PackageJsonTool/index.js";

container.use(PackageJsonToolFeature);

const tool = container.resolve(PackageJsonTool);

// Load the project's own package.json (cwd-relative)
const file = tool.loadOrThrow();

file.setDependency("@webiny/cli", "6.1.0");
tool.save(file);

// Or load an explicit path
const other = tool.loadOrThrow("packages/api/package.json");
```
