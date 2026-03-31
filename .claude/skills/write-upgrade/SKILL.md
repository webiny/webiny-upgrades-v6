---
name: write-upgrade
description: Use when writing a new Webiny upgrade script for a specific version in the webiny-upgrades-v6 project.
---

# Writing a Webiny Upgrade Script

## File Structure

Every upgrade lives in `src/upgrades/<version>/` and consists of exactly two files:

```
src/upgrades/6.2.0/
  Upgrade.ts    # implementation
  index.ts      # feature export (default export)
```

Use relative imports throughout — `~/` aliases are not reliable here.

## Upgrade.ts

Implement `Upgrade.Interface` — a `version` property and two methods: `canHandle` and `execute`.

`canHandle` returns `true` when this upgrade's version falls within the requested range: greater than `currentVersion` (not already applied) and less than or equal to `targetVersion` (within scope). The handler also checks upgrade history and skips already-executed upgrades. Do not use registry checks — the version does not exist on npm yet when the upgrade is being written.

```ts
import { Upgrade as UpgradeAbstraction } from "../../base/Upgrade/index.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";
import { Version } from "../../base/Version/index.js";

class UpgradeImpl implements UpgradeAbstraction.Interface {
    public readonly version = Version.create("6.2.0");

    public constructor(private readonly packageJsonTool: PackageJsonTool.Interface) {}

    public async canHandle({ targetVersion, currentVersion }: UpgradeAbstraction.Params): Promise<boolean> {
        return this.version.between(currentVersion, targetVersion);
    }

    public async execute(): Promise<void> {
        // Version-specific transformations only.
        // Do NOT call upWebiny.execute() — the handler pins all @webiny/*
        // packages to the target version after all upgrade steps complete.
    }
}

export const Upgrade = UpgradeAbstraction.createImplementation({
    implementation: UpgradeImpl,
    dependencies: [PackageJsonTool]
});
```

## index.ts

```ts
import { createFeature } from "../../utils/createFeature.js";
import { Upgrade } from "./Upgrade.js";

export default createFeature({
    name: "Upgrade 6.2.0",
    register(container) {
        container.register(Upgrade);
    }
});
```

## Available Dependencies

Declare these in the `dependencies` array of `createImplementation`. They are resolved from the DI container automatically.

| Abstraction | Import (relative from `src/upgrades/<version>/`) | Description |
|---|---|---|
| `Context` | `../../base/Context/index.js` | `cwd`, `registry`, `inputVersion`, `targetVersion`, `installedVersion` (read-once from disk), `currentVersion` (logical — advances after each upgrade step), `resolve()` |
| `Logger` | `../../base/Logger/index.js` | `debug`, `info`, `warn`, `error`, `fatal`, `done` — standard pino levels + `done` (emits `info` with `_done` metadata; JSON transport maps to `type: "done"`) |
| `UpWebiny` | `../../tool/UpWebiny/index.js` | Consolidates all `@webiny/*` packages and bare `webiny` into `dependencies` at the target version (removes from devDependencies/peerDependencies if present); takes `{ version }` only — **called by the handler, not by upgrade scripts** |
| `PackageJsonTool` | `../../tool/PackageJsonTool/index.js` | Higher-level package.json ops scoped to `cwd`. `load(target?: string): PackageJsonFile \| null` — loads `package.json` from cwd or given path. `save(file): void` — writes back to disk. See **PackageJsonFile API** below. |
| `PackageJsonService` | `../../service/PackageJson/index.js` | Low-level load/save for any `package.json` path. `load(target: string): PackageJsonFile \| null`, `save(file): void`. Same `PackageJsonFile` API as above. |
| `DependencyGuard` | `../../tool/DependencyGuard/index.js` | `execute(): Mismatch[]` — reads `node_modules/@webiny/cli/files/references.json` (synchronous), compares against user's `package.json` (all four sections), strips ranges, returns `Mismatch[]` where each entry is `{ name, userVersion, expectedVersion }` (empty array = no mismatches). |
| `UpgradeHistory` | `../../tool/UpgradeHistory/index.js` | `add(version)`, `remove(version)`, `get(version): Entry \| null`, `list(): Entry[]` — reads/writes `webiny.history` array in package.json. Each entry has `{ version, timestamp }`. Managed by the handler automatically. |
| `RegistryService` | `../../service/Registry/index.js` | `getLatestVersion(name: string): Promise<Version \| null>` — resolves the current `latest` dist-tag. `getVersion(name: string, version: string \| Version): Promise<Version \| null>` — resolves a specific version. |

### PackageJsonFile API

The object returned by `PackageJsonTool.load()` or `PackageJsonService.load()`:

```ts
// read
file.getDependencies(): Record<string, string>
file.getDevDependencies(): Record<string, string>
file.getPeerDependencies(): Record<string, string>
file.getResolutions(): Record<string, string>
file.getVersion(): string | null

// dependencies
file.getDependency(name: string): string | null
file.setDependency(name: string, version: string | Version): void
file.removeDependency(name: string): void

// devDependencies
file.getDevDependency(name: string): string | null
file.setDevDependency(name: string, version: string | Version): void
file.removeDevDependency(name: string): void

// peerDependencies
file.getPeerDependency(name: string): string | null
file.setPeerDependency(name: string, version: string | Version): void
file.removePeerDependency(name: string): void

// resolutions
file.getResolution(name: string): string | null
file.setResolution(name: string, version: string | Version): void
file.removeResolution(name: string): void

// arbitrary fields
file.get(key: string): unknown
file.set(key: string, value: unknown): void
```

## Post-Task Sequence

After every change, run these commands in order:

1. `yarn prettier:fix`
2. `yarn eslint:fix`
3. `yarn`
4. `yarn build`
5. `yarn test`

If any step fails, fix the issue and restart from step 1.

## Fix Upgrades

To ship a bugfix for an already-released upgrade (e.g. `6.1.0`), create a new upgrade with a pre-release version like `6.1.0-fix.0`. History matching is exact on `version.raw`, so `6.1.0-fix.0` runs even when `6.1.0` is already in history.

## Rules

- `canHandle` must return `this.version.between(currentVersion, targetVersion)` — this upgrade's hardcoded version must fall in the range
- Do **not** call `upWebiny.execute()` in `execute` — the handler pins all `@webiny/*` packages to the target version after all steps complete
- Never check the npm registry in `canHandle` or `execute` — the version does not exist yet
- Always inject dependencies, never instantiate services directly
- Use relative imports, not `~/`
- Windows compatibility: use `path.join()` for all file paths, never string concatenation or hardcoded slashes
