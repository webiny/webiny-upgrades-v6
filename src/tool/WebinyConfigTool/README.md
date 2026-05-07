# WebinyConfigTool

A DI-registered tool for reading and programmatically modifying a project's `webiny.config.tsx` file during upgrade scripts. It parses the file with `ts-morph` and exposes two focused sub-objects — `file.imports` for managing import declarations and `file.jsx` for manipulating the JSX tree — both operating on the same underlying source file.

## API

| Export | Kind | Description |
|---|---|---|
| `WebinyConfigTool` | abstraction token | DI token for the tool; resolved to call `read` / `save`. |
| `WebinyConfigTool.Interface` | type | `{ read(): File; save(file: File): void }` |
| `WebinyConfigTool.File` | type | `{ imports: Imports; jsx: Jsx; save(): void }` |
| `WebinyConfigTool.Imports` | type | `{ add(opts: ImportOptions): void }` |
| `WebinyConfigTool.Jsx` | type | `{ addChild(tag, opts?); insertBefore(ref, tag, opts?); insertAfter(ref, tag, opts?) }` |
| `WebinyConfigTool.ChildOptions` | type | `{ comment?, props?, children? }` passed when adding/inserting elements. |
| `WebinyConfigTool.ImportEntry` | type | `string \| Record<string, string>` — plain name or `{ originalName: localAlias }`. |
| `WebinyConfigTool.ImportOptions` | type | `{ package: string; imports: ImportEntry[] }` passed to `imports.add`. |
| `WebinyConfigToolFeature` | feature | Registers the concrete implementation into the DI container. |

### `File` methods

| Method | Description |
|---|---|
| `save()` | Writes all mutations back to disk. |

### `Imports` methods (`file.imports`)

| Method | Description |
|---|---|
| `add(opts)` | Adds named imports from a package. Creates a new import declaration if none exists for the package; merges into the existing one otherwise. Skips (with a warning) any name already imported. |

### `Jsx` methods (`file.jsx`)

| Method | Description |
|---|---|
| `addChild(tag, opts?)` | Appends a JSX element inside the root `<Extensions>` fragment. If the element already exists and `opts.children` is provided, merges children into it (structural merge); otherwise warns and no-ops. |
| `insertBefore(ref, tag, opts?)` | Inserts a JSX element before the first sibling matching `ref`; no-op if `tag` already exists. |
| `insertAfter(ref, tag, opts?)` | Inserts a JSX element after the first sibling matching `ref`; no-op if `tag` already exists. |

## Usage

```ts
import { WebinyConfigTool, WebinyConfigToolFeature } from "./tool/WebinyConfigTool/index.js";

container.use(WebinyConfigToolFeature);

const tool = container.resolve(WebinyConfigTool);
const file = tool.read();

// Add named imports
file.imports.add({ package: "@webiny/extensions", imports: ["Infra", "Api"] });
file.imports.add({ package: "@webiny/extensions", imports: [{ Infra: "Infrastructure" }] });

// Add / insert JSX elements
file.jsx.addChild("MyExtension", {
    comment: "Added by upgrade 6.1.0",
    props: { path: '"./extensions/myExtension"' }
});

tool.save(file);
```
