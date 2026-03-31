# DependencyGuard — Design Spec

## Summary

A new Tool that reads `node_modules/@webiny/cli/files/references.json` and compares it against the user's `package.json` to detect version mismatches. Returns a structured list of mismatches for callers to act on (warn, throw, log — decided at call site).

## Architecture

New Tool at `src/tool/DependencyGuard/` following the standard four-file pattern:

```
src/tool/DependencyGuard/
  abstraction.ts         — Mismatch type + IDepedencyGuard interface
  DependencyGuard.ts     — implementation
  feature.ts             — DependencyGuardFeature
  index.ts               — re-exports
  DependencyGuard.test.ts
```

Registered in `src/container.ts` in the tools section, after `PackageJsonToolFeature`.

## Interface

```ts
interface Mismatch {
    name: string;
    userVersion: string;     // range-stripped, e.g. "18.2.0"
    expectedVersion: string; // range-stripped from references.json
}

interface IDependencyGuard {
    verify(): Promise<Mismatch[]>;
}
```

## `references.json` Shape

```ts
{
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    resolutions?: Record<string, string>;
}
```

Read as raw JSON via `fs/promises` from `<cwd>/node_modules/@webiny/cli/files/references.json`. Not loaded through `PackageJsonService` — it is not a `package.json` file.

## Implementation Logic

1. Read and parse `references.json` from `<cwd>/node_modules/@webiny/cli/files/references.json`
2. Load user's `package.json` via `PackageJsonTool`
3. For each of the four sections (`dependencies`, `devDependencies`, `peerDependencies`, `resolutions`):
   - Iterate packages the **user has** in that section
   - Look up the same package name in the **same section** of `references.json`
   - If found: strip ranges from both versions, compare — collect mismatch if different
4. Return `Mismatch[]` (empty array = all in sync)

## Range Stripping

Strip leading range characters before comparing:

```ts
const stripRange = (version: string): string => version.replace(/^[\^~>=<v\s]+/, "");
```

Applied to both the user's version and the references version before comparison.

## Dependencies Injected

| Dependency | Purpose |
|---|---|
| `Context` | provides `cwd` to locate `references.json` |
| `PackageJsonTool` | loads the user's `package.json` |

## Error Handling

- `references.json` not found or unreadable → throw with clear message
- `package.json` not found (`PackageJsonTool.load()` returns null) → throw with clear message
- Missing sections in `references.json` → treat as empty (no checks for that section)

## Registration

`src/container.ts`, tools section:

```ts
DependencyGuardFeature.register(container);
```

## Tests

| Scenario | Expected |
|---|---|
| All user versions match references | returns `[]` |
| Version mismatch in dependencies | returns mismatch entry |
| User version has range prefix (`^18.2.0`) | stripped before compare — matches `18.2.0` |
| Package in user's project absent from references | ignored |
| References section missing entirely | treated as empty, no mismatches |
| `package.json` not loadable | throws |
| `references.json` not found | throws |
| Mismatch across multiple sections | all collected and returned |

## Documentation Updates

Add `DependencyGuard` to the dependency table in both `SKILL.md` (write-upgrade) and `AGENTS.md`.
