# WebinyConfigTool Design

**Date:** 2026-05-06  
**Status:** Approved

## Overview

A DI-registered tool that reads and mutates `webiny.config.tsx` via a ts-morph AST, with duplicate-safe `addChild` and structural merge for nested elements. Follows the same four-file pattern as `PackageJsonTool`. Replaces the standalone `addInfraEncryption` function in 6.3.0.

## File Structure

```
src/tool/WebinyConfigTool/
  abstraction.ts            — WebinyConfigTool const + namespace (Interface, File)
  WebinyConfigTool.ts       — WebinyConfigToolImpl (thin DI wrapper)
  feature.ts                — WebinyConfigToolFeature
  index.ts                  — re-exports abstraction + feature
  WebinyConfigFile.ts       — standalone class wrapping ts-morph SourceFile
  WebinyConfigFile.test.ts
  WebinyConfigTool.test.ts
```

`WebinyConfigFile` is not exported from `index.ts` — it is an implementation detail. The public `File` type in the namespace is the `IWebinyConfigFile` interface.

## API

```ts
interface AddChildOptions {
    comment?: string;                               // renders as {/* comment */} above the element
    props?: Record<string, string>;                 // raw JS expressions: { passphrase: 'process.env.X || ""' }
    children?: (builder: WebinyConfigBuilder) => void;
}

interface WebinyConfigBuilder {
    addChild(tag: string, options?: AddChildOptions): void;
}

interface IWebinyConfigFile extends WebinyConfigBuilder {
    save(): void;
}

interface IWebinyConfigTool {
    read(): IWebinyConfigFile;        // throws if file not found
    save(file: IWebinyConfigFile): void;
}
```

Usage:

```ts
const webinyConfig = this.webinyConfigTool.read();
webinyConfig.addChild("Infra.Env.IsProd", {
    comment: "Encryption MUST always be configured for production environments.",
    children: (children) => {
        children.addChild("Infra.Encryption", {
            props: { passphrase: 'process.env.WEBINY_ENCRYPTION_PASSPHRASE || ""' }
        });
    }
});
this.webinyConfigTool.save(webinyConfig);
```

## Structural Merge / Duplicate Detection

`addChild(tag, opts)` operates on the JSX fragment's (or parent element's) direct children:

1. **Not found → insert**: build full JSX text (comment + opening/closing tags with children, or self-closing), insert after the last non-whitespace JSX child.
2. **Found, no children callback → warn + no-op**: log a `logger.warn` (e.g. `"<Tag> already exists, skipping"`) and leave the file unchanged. Duplicates are never added.
3. **Found, children callback provided → structural merge**: call the children callback with a builder scoped to the existing element's children. Each nested `addChild` applies the same logic one level deeper, enabling safe 3rd-level nesting. The warning fires at whichever nested level hits an existing element.

`WebinyConfigFile` receives `Logger.Interface` via its constructor (passed by `WebinyConfigToolImpl` at construction time) so it can emit warnings without breaking its standalone testability.

**Indentation**: inferred from the first existing real child's column offset via ts-morph `getStart()`. Each nesting level adds 4 spaces.

**Props**: always rendered as `prop={expression}` (expression syntax only).

## Container Registration

`WebinyConfigToolFeature` is registered in `src/container.ts` in the tools section alongside `PackageJsonToolFeature`.

The 6.3.0 `Upgrade` declares `WebinyConfigTool` as a dependency (alongside existing `PackageJsonTool`, `PackageManagerService`, `Context`).

## Changes to 6.3.0 Upgrade

- `addInfraEncryption.ts` and `addInfraEncryption.test.ts` are deleted.
- `Upgrade.ts` calls `WebinyConfigTool` instead.
- `Upgrade.test.ts` replaces the `addInfraEncryption` mock with a `WebinyConfigTool` mock.
- `Upgrade.integration.test.ts` fixture files remain as-is; assertions updated to check JSX structure via the tool rather than raw text.

## Testing

### `WebinyConfigFile.test.ts` (unit, temp files)

- Inserts element with comment, props, and children
- Warns and no-ops when tag already exists and no children callback
- Structural merge: children callback on existing element merges children
- Structural merge at 3 levels deep
- No-op when file has no JSX fragment
- `save()` writes changes to disk

### `WebinyConfigTool.test.ts` (unit, mocked Context)

- `read()` resolves path via `context.resolve("webiny.config.tsx")`
- `save()` delegates to the file's `save()`
- `read()` throws when file not found

### `Upgrade.test.ts` / `Upgrade.integration.test.ts` (6.3.0)

- Unit test: `WebinyConfigTool` mock replaces `addInfraEncryption` mock
- Integration test: fixture files unchanged; output assertions verify JSX structure is present
