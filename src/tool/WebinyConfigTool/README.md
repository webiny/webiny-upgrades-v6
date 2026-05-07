# WebinyConfigTool

A DI-registered tool for reading and programmatically modifying a project's `webiny.config.tsx` file during upgrade scripts. It parses the file with `ts-morph`, locates the root JSX fragment returned by the `Extensions` component, and lets callers append or insert JSX elements — preserving existing indentation and skipping elements that are already present (idempotent by default).

## API

| Export | Kind | Description |
|---|---|---|
| `WebinyConfigTool` | abstraction token | DI token for the tool; resolved to call `read` / `save`. |
| `WebinyConfigTool.Interface` | type | `{ read(): File; save(file: File): void }` |
| `WebinyConfigTool.File` | type | Extends `Builder`; additionally exposes `save()` (writes back to disk). |
| `WebinyConfigTool.Builder` | type | `{ addChild(tag, opts?); insertBefore(ref, tag, opts?); insertAfter(ref, tag, opts?) }` |
| `WebinyConfigTool.ChildOptions` | type | `{ comment?, props?, children? }` passed when adding/inserting elements. |
| `WebinyConfigToolFeature` | feature | Registers the concrete implementation into the DI container. |

### `Builder` methods

| Method | Description |
|---|---|
| `addChild(tag, opts?)` | Appends a JSX element inside the root `<Extensions>` fragment; no-op if the tag already exists. |
| `insertBefore(ref, tag, opts?)` | Inserts a JSX element before the first sibling matching `ref`; no-op if `tag` already exists. |
| `insertAfter(ref, tag, opts?)` | Inserts a JSX element after the first sibling matching `ref`; no-op if `tag` already exists. |

## Usage

```ts
import { WebinyConfigTool, WebinyConfigToolFeature } from "./tool/WebinyConfigTool/index.js";

container.use(WebinyConfigToolFeature);

const tool = container.resolve(WebinyConfigTool);
const file = tool.read();

file.addChild("MyExtension", {
    comment: "Added by upgrade 6.1.0",
    props: { path: '"./extensions/myExtension"' }
});

tool.save(file);
```
