# WebinyConfigFile insertBefore / insertAfter Design

**Date:** 2026-05-06  
**Status:** Approved

## Overview

Extend `IWebinyConfigBuilder` with `insertBefore` and `insertAfter` methods that position a new JSX element relative to a named sibling. If the reference sibling is not found, warn and fall back to appending at the end. Split `WebinyConfigFile.ts` to extract pure text-building logic into a separate `JsxTextBuilder` class for independent testability.

## API

```ts
interface IWebinyConfigBuilder {
    addChild(tag: string, options?: ChildOptions): void;
    insertBefore(ref: string, tag: string, options?: ChildOptions): void;
    insertAfter(ref: string, tag: string, options?: ChildOptions): void;
}
```

`ref` — sibling tag name to position against (e.g. `"Infra.Env.IsProd"`).  
`tag` — the new element to insert.  
`options` — same `ChildOptions` as `addChild`: `comment`, `props`, `children`.

Both methods are available at every nesting level — the builder returned inside a `children` callback has all three methods scoped to that container.

## Behaviour

### Normal path (ref found, tag absent)
Insert `tag` immediately before / after `ref`'s position in the current container's direct children. Build the element text using `JsxTextBuilder` with the same indentation as the ref element.

### Ref not found
```
logger.warn(`<${ref}> not found, inserting <${tag}> at end`)
```
Fall back to appending after the last child (same as `addChild` with no positioning).

### Tag already exists (duplicate)
```
logger.warn(`<${tag}> already exists, skipping`)
```
No-op. Duplicate detection is scoped to the **current container's direct children only** — identical to `addChild`. Runs before any position lookup.

### No JSX fragment
Same as `addChild`: warn and no-op.

## File Structure

```
src/tool/WebinyConfigTool/
  abstraction.ts              — add insertBefore / insertAfter to IWebinyConfigBuilder
  JsxTextBuilder.ts           — NEW: pure text construction, no ts-morph dependency
  JsxTextBuilder.test.ts      — NEW: pure unit tests (no tmp dirs)
  WebinyConfigFile.ts         — slim down: delegate text building to JsxTextBuilder
  WebinyConfigFile.test.ts    — add insertBefore / insertAfter test cases
```

All other files (`WebinyConfigTool.ts`, `feature.ts`, `index.ts`) are unchanged.

## JsxTextBuilder

Stateless class with no ts-morph dependency. Receives plain strings and returns strings.

```ts
class JsxTextBuilder {
    buildElement(tag: string, options: WebinyConfigTool.ChildOptions, indent: string): string
    buildPropsStr(props?: Record<string, string>): string
}
```

`buildElement` produces the full text block: optional `{/* comment */}` line, then self-closing `<Tag />` or block `<Tag>…</Tag>` with recursively built children at `indent + "    "`. The `children` callback in `ChildOptions` is invoked with a synthetic builder that collects child lines — same two-path design as today (new elements use text capture, never live AST mutations inside `buildElement`).

`WebinyConfigFile` removes its own `buildText` and `buildPropsStr` methods and delegates to a `JsxTextBuilder` instance.

## InsertPosition type (internal)

```ts
type InsertPosition =
    | { mode: 'append' }
    | { mode: 'before'; ref: string }
    | { mode: 'after';  ref: string }
```

`addToContainer` gains an optional `position: InsertPosition = { mode: 'append' }` parameter. `insertBefore` / `insertAfter` call `addToContainer` with the appropriate mode after checking duplicates (which `addToContainer` already handles).

Insertion strategy:
- `after`: insert at `refChild.getEnd()` with `"\n" + text` — same pattern as the existing append path.
- `before`: find `ref`'s index in `realChildren`. If index > 0, insert after `realChildren[index - 1].getEnd()` with `"\n" + text` (reuses the same pattern). If index === 0 (ref is the first child), insert into the container using `insertIntoEmpty`-style logic before the first child.

Indentation for the inserted element is inferred from the ref element's column offset, not from the first child — so it matches the surrounding elements regardless of where in the list `ref` sits.

## Testing

### `JsxTextBuilder.test.ts` (pure unit tests, no files)

- `buildElement` renders a self-closing element with no options
- `buildElement` renders comment above element
- `buildElement` renders props as `{expression}` attributes
- `buildElement` renders block element with nested children
- `buildElement` indents nested children one level deeper
- `buildPropsStr` returns empty string for no props
- `buildPropsStr` joins multiple props with spaces

### `WebinyConfigFile.test.ts` (additions)

- `insertBefore` places element immediately before the ref
- `insertAfter` places element immediately after the ref
- `insertBefore` warns and appends at end when ref not found
- `insertAfter` warns and appends at end when ref not found
- `insertBefore` warns and no-ops when tag already exists
- `insertAfter` warns and no-ops when tag already exists
- `insertBefore` works inside a `children` callback (nested level)
- `insertAfter` works inside a `children` callback (nested level)
