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

Both methods are available at every nesting level — the builder returned inside a `children` callback exposes all three methods, scoped to that container. `makeBuilder` must forward `insertBefore` / `insertAfter` with the same `containerPath`.

## Behaviour

### Check order

For both `insertBefore` and `insertAfter`, checks run in this order:
1. No JSX fragment → warn, no-op
2. Container path cannot be resolved → warn, no-op
3. `tag` already exists among direct children → warn, no-op (**no** structural merge — see note below)
4. `ref` not found → warn, fall back to append at end
5. Normal insertion at the requested position

### Normal path (ref found, tag absent)

Insert `tag` immediately before / after `ref`'s position in the current container's direct children. Indent is inferred from `ref`'s column offset (see **Indentation** below).

If `ref` appears more than once, the first occurrence in document order is used.

### Ref not found (step 4)

```
logger.warn(`<${ref}> not found, inserting <${tag}> at end`)
```

Fall back to appending after the last child — same as `addChild` with no positioning.

### Tag already exists (step 3)

```
logger.warn(`<${tag}> already exists, skipping`)
```

No-op. Unlike `addChild`, `insertBefore` / `insertAfter` do **not** perform structural merge even when `options.children` is provided. Positioning is meaningless for an already-existing element; the caller should use `addChild` with a `children` callback for structural merge.

### No JSX fragment / path unresolvable (steps 1–2)

Same behaviour as `addChild`.

## File Structure

```
src/tool/WebinyConfigTool/
  abstraction.ts              — add insertBefore / insertAfter to IWebinyConfigBuilder
  JsxTextBuilder.ts           — NEW: pure text construction, no ts-morph dependency
  JsxTextBuilder.test.ts      — NEW: pure unit tests (no tmp dirs)
  WebinyConfigFile.ts         — slim down: delegate text building to JsxTextBuilder;
                                add insertBefore / insertAfter; update makeBuilder
  WebinyConfigFile.test.ts    — add insertBefore / insertAfter test cases
```

All other files (`WebinyConfigTool.ts`, `feature.ts`, `index.ts`) are unchanged.

## JsxTextBuilder

Stateless class, no ts-morph dependency. Takes plain strings and returns strings.

```ts
class JsxTextBuilder {
    buildElement(tag: string, options: WebinyConfigTool.ChildOptions, indent: string): string
    private buildPropsStr(props?: Record<string, string>): string
}
```

`buildElement` produces the full text block: optional `{/* comment */}` line, then self-closing `<Tag />` or block `<Tag>…</Tag>` with recursively built children at `indent + "    "`.

The `children` callback in `ChildOptions` is invoked with a **synthetic builder** that collects child lines into an array. This builder only supports `addChild` (appending). `insertBefore` / `insertAfter` on this synthetic builder also append (no existing siblings exist when building from scratch — no warning is emitted). This is the same two-path design as today: new elements use text capture, live AST mutations only happen in the structural-merge path.

`WebinyConfigFile` removes its own `buildText` and `buildPropsStr` methods and delegates to a `JsxTextBuilder` instance.

`buildPropsStr` is private — tested indirectly through `buildElement`.

## InsertPosition type (internal)

```ts
type InsertPosition =
    | { mode: 'append' }
    | { mode: 'before'; ref: string }
    | { mode: 'after';  ref: string }
```

`addToContainer` gains an optional `position: InsertPosition = { mode: 'append' }` parameter. `insertBefore` / `insertAfter` call `addToContainer` with the appropriate mode after duplicate detection (which `addToContainer` handles internally).

## Insertion strategy

**`after` mode:** insert at `refChild.getEnd()` with `"\n" + text` — same pattern as the existing append path.

**`before` mode:**
- If `ref` is not the first child (index > 0): insert after `realChildren[index - 1].getEnd()` with `"\n" + text` — reuses the same append-after-sibling pattern.
- If `ref` is the first child (index === 0): insert after the container's opening tag with `"\n" + text`. For a fragment, use `fragment.getOpeningFragment().getEnd()`; for a `JsxElement`, use `container.getOpeningElement().getEnd()`.

## Indentation

Add a new helper to `WebinyConfigFile`:

```ts
private inferIndentFromNode(node: Node): string
```

Returns the column offset of `node.getStart()` from the start of its line — i.e. the number of spaces between the last `\n` and the `<`. Used by `before`/`after` modes to match the surrounding elements' indentation.

`addChild` continues to use `inferIndent` (infers from first existing child or container fallback). `insertBefore` / `insertAfter` use `inferIndentFromNode(refChild)` when the ref is found, and fall back to `inferIndent` when the ref is not found and they append.

## Testing

### `JsxTextBuilder.test.ts` (pure unit tests, no files)

- `buildElement` renders a self-closing element with no options
- `buildElement` renders a comment above the element
- `buildElement` renders props as `{expression}` attributes
- `buildElement` renders a block element with nested `addChild` children
- `buildElement` indents nested children one level deeper
- `buildElement` with nested `insertBefore` / `insertAfter` on the synthetic builder appends (no error, no warning)

### `WebinyConfigFile.test.ts` (additions)

- `insertBefore` places element immediately before the ref
- `insertAfter` places element immediately after the ref
- `insertBefore` with ref as the first child places element before it
- `insertBefore` warns and appends at end when ref not found
- `insertAfter` warns and appends at end when ref not found
- `insertBefore` warns and no-ops when tag already exists
- `insertAfter` warns and no-ops when tag already exists
- `insertBefore` / `insertAfter` do not perform structural merge when tag exists and children callback is provided — warn and no-op
- `insertBefore` works inside a `children` callback on an **existing** container (real AST, `makeBuilder` path)
- `insertAfter` works inside a `children` callback on an **existing** container (real AST, `makeBuilder` path)
