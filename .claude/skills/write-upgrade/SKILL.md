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

`canHandle` returns `true` when this upgrade's version falls within the range `(currentVersion, targetVersion]` — strictly greater than `currentVersion` and less than or equal to `targetVersion`.

- **`currentVersion`** is the user's installed Webiny version. It acts as a lower bound so that upgrades at or below the user's current version are skipped. The handler advances `currentVersion` after each successful upgrade step, so when running `6.1.0 → 6.3.0`, the 6.2.0 upgrade sees `currentVersion=6.1.0` and the 6.3.0 upgrade sees `currentVersion=6.2.0`.
- **`targetVersion`** is the version the user wants to reach. It caps the upper bound so only relevant upgrades run.

Both bounds are required — without `currentVersion`, older upgrades would re-run on every invocation. The handler also checks upgrade history and skips already-executed upgrades as a second layer of protection. Do not use registry checks — the version does not exist on npm yet when the upgrade is being written.

```ts
import { Upgrade as UpgradeAbstraction } from "../../base/Upgrade/index.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";
import { WebinyConfigTool } from "../../tool/WebinyConfigTool/index.js";
import { Version } from "../../base/Version/index.js";

class UpgradeImpl implements UpgradeAbstraction.Interface {
    public readonly version = Version.create("6.2.0");

    public constructor(
        private readonly packageJsonTool: PackageJsonTool.Interface,
        private readonly webinyConfigTool: WebinyConfigTool.Interface
    ) {}

    public async canHandle({ targetVersion, currentVersion }: UpgradeAbstraction.Params): Promise<boolean> {
        return this.version.between(currentVersion, targetVersion);
    }

    public async execute(): Promise<void> {
        const packageJson = this.packageJsonTool.loadOrThrow();
        // Version-specific transformations go here.
        this.packageJsonTool.save(packageJson);
    }
}

export const Upgrade = UpgradeAbstraction.createImplementation({
    implementation: UpgradeImpl,
    dependencies: [PackageJsonTool, WebinyConfigTool]
});
```

Only include `WebinyConfigTool` in `dependencies` if the upgrade actually modifies `webiny.config.tsx`.

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
| `PackageJsonTool` | `../../tool/PackageJsonTool/index.js` | Higher-level package.json ops scoped to `cwd`. `load(target?: string): PackageJsonFile \| null`, `loadOrThrow(target?: string): PackageJsonFile` (throws on failure — **prefer this over `load` + null guard**), `save(file): void`. See **PackageJsonFile API** below. |
| `WebinyConfigTool` | `../../tool/WebinyConfigTool/index.js` | Reads and mutates `webiny.config.tsx` via ts-morph AST. `read(): WebinyConfigFile` (throws if not found), `save(file): void`. `addImport(opts)` adds named imports (merges into existing declaration for the same package, warns and skips duplicates). `addChild(tag, opts)` merges structurally into existing parents (warns and skips duplicates). `insertBefore(ref, tag, opts)` / `insertAfter(ref, tag, opts)` position a new element relative to a named sibling (warn + append at end if ref not found). See **WebinyConfigFile API** below. |
| `PackageJsonService` | `../../service/PackageJson/index.js` | Low-level load/save for any `package.json` path. `load(target: string): PackageJsonFile \| null`, `loadOrThrow(target: string): PackageJsonFile`, `save(file): void`. Same `PackageJsonFile` API as above. |
| `DependencyGuard` | `../../tool/DependencyGuard/index.js` | `execute(): Mismatch[]` — reads `node_modules/@webiny/cli/files/references.json` (synchronous), compares against user's `package.json` (all four sections), strips ranges, returns `Mismatch[]` where each entry is `{ name, userVersion, expectedVersion }` (empty array = no mismatches). |
| `UpgradeHistory` | `../../tool/UpgradeHistory/index.js` | `add(version)`, `remove(version)`, `get(version): Entry \| null`, `list(): Entry[]` — reads/writes `webiny.history` array in package.json. Each entry has `{ version, timestamp }`. Managed by the handler automatically. |
| `PackageManagerService` | `../../service/PackageManager/index.js` | `install()`, `version()`, `name(): "yarn" \| "pnpm" \| "npm"` — use `name()` to branch on the user's package manager without touching the filesystem directly. |
| `RegistryService` | `../../service/Registry/index.js` | `getLatestVersion(name: string): Promise<Version \| null>` — resolves the current `latest` dist-tag. `getVersion(name: string, version: string \| Version): Promise<Version \| null>` — resolves a specific version. |

### WebinyConfigFile API

The object returned by `WebinyConfigTool.read()`:

```ts
file.addImport(options: ImportOptions): void
file.addChild(tag: string, options?: ChildOptions): void
file.insertBefore(ref: string, tag: string, options?: ChildOptions): void
file.insertAfter(ref: string, tag: string, options?: ChildOptions): void
file.save(): void

type ImportEntry = string | Record<string, string>;
interface ImportOptions {
    package: string;
    imports: ImportEntry[];        // plain string or { originalName: localAlias }
}

interface ChildOptions {
    comment?: string;                       // renders as {/* comment */} above the element
    props?: Record<string, string>;         // expression syntax: { passphrase: 'process.env.X || ""' }
    children?: (builder: Builder) => void;  // nested children callback
}
```

`addChild` behaviour:
- **Not found** → inserts after the last JSX fragment child (self-closing if no `children`, block element if `children` provided)
- **Found, no `children` callback** → logs a warning and skips (never creates duplicates)
- **Found, `children` callback provided** → structural merge: recurses into the existing element

`insertBefore(ref, tag, options)` / `insertAfter(ref, tag, options)` behaviour:
- **`ref` not found** → warns and falls back to append at end
- **`tag` already exists** → warns and no-ops — **no** structural merge, even if `options.children` provided
- **Normal path** → inserts `tag` immediately before/after the first occurrence of `ref`; indent is inferred from `ref`'s column offset
- Available at every nesting level via the `Builder` passed to a `children` callback

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

## Testing

Every upgrade needs both a unit test and an integration test.

### Unit test (`Upgrade.test.ts`)

Next to `Upgrade.ts`. Mocks `PackageJsonTool` via `registerUpgradeDeps`. Uses the canonical `createMockPackageJsonFile` from `src/__tests__/utils/`. If the upgrade uses `WebinyConfigTool`, register a mock instance directly in `createContainer` (not in `registerUpgradeDeps`). Existing examples: `src/upgrades/6.3.0/Upgrade.test.ts`.

### Integration test (`Upgrade.integration.test.ts`)

Next to `Upgrade.ts`. Uses the real `UpgradeHandler` + `UpgradeRunner` pipeline against a fixture `package.json` copied into a tmpdir.

Layout:

```
src/upgrades/<version>/
├── Upgrade.ts
├── Upgrade.test.ts
├── Upgrade.integration.test.ts
├── __tests__/
│   └── fixtures/
│       └── before/
│           └── package.json         ← hand-written, minimal, self-contained
└── index.ts
```

Test shape:

```ts
import { describe, it, expect } from "vitest";
import path from "node:path";
import { createUpgradeIntegrationHarness } from "../../__tests__/utils/createUpgradeIntegrationHarness.js";

const fixtureDir = path.join(import.meta.dirname, "__tests__", "fixtures", "before");

describe("Upgrade 6.x.0 - integration", () => {
    it("applies its transformations and pins @webiny/* to the target version", async () => {
        const harness = await createUpgradeIntegrationHarness({
            fixtureDir,
            currentVersion: "6.(x-1).0",
            targetVersion: "6.x.0"
        });

        await harness.run();

        const pkg = harness.readPackageJson();
        // assert upgrade-specific transformations
        expect(pkg.dependencies?.["@webiny/cli"]).toBe("6.x.0");
        expect(harness.upgradeHistory.list()).toContainEqual(
            expect.objectContaining({ version: "6.x.0" })
        );
    });
});
```

### Chain test

After shipping a new upgrade, bump `targetVersion` and extend assertions in `src/__tests__/integration/chain.test.ts`.

### Coverage

Thresholds in `vitest.config.ts` enforce 100% statements / functions / lines and 98% branches. `yarn test:coverage` fails if any threshold regresses.

## Post-Task Sequence

After every change, run:

```bash
yarn lint:fix && yarn && yarn build && yarn test && yarn adio:check
```

If any step fails, fix the issue and re-run the full chain.

## Fix Upgrades

To ship a bugfix for an already-released upgrade (e.g. `6.1.0`), create a new upgrade with a pre-release version like `6.1.0-fix.0`. History matching is exact on `version.raw`, so `6.1.0-fix.0` runs even when `6.1.0` is already in history.

## Rules

- `canHandle` must return `this.version.between(currentVersion, targetVersion)` — this upgrade's hardcoded version must fall in the range
- Do NOT call `upWebiny.execute()` in an upgrade — the handler pins all `@webiny/*` packages to the target version after all upgrade steps complete
- Never check the npm registry in `canHandle` or `execute` — the version does not exist yet
- Always inject dependencies, never instantiate services directly
- Use relative imports, not `~/`
- Windows compatibility: use `path.join()` for all file paths, never string concatenation or hardcoded slashes
