# Upgrade Integration Tests — Design Spec

## Summary

Add end-to-end integration tests that run real upgrade scripts (e.g. `6.3.0`) through the real `UpgradeHandler` against a fixture project on disk, asserting the resulting `package.json` and `webiny.history`. Catches regressions in the handler ↔ upgrade contract that the existing unit tests miss (history recording, semver ordering, post-step `UpWebiny` pinning, rollback wiring).

Two test surfaces:

1. **Per-upgrade integration tests** — one per shipped upgrade, co-located with the upgrade source.
2. **Chained-run test** — a single representative chain (e.g. `6.0.0 → latest`) that exercises the handler's chaining behavior against the real `src/upgrades` directory.

## Non-goals

- Replacing the existing per-upgrade unit tests (`Upgrade.test.ts`) — they stay as-is.
- Network access. `RegistryService` is mocked.
- Real package installs. `PackageManager.install` is a no-op.
- Real git. `Git.isClean` returns `true`, `Git.restore` is a no-op.
- Exhaustive chain coverage (all (current, target) pairs). One representative chain only.

## Harness

New helper at `src/__tests__/utils/createUpgradeIntegrationHarness.ts`. The existing `createIntegrationContainer.ts` is **not modified** — it stays focused on `UpgradeRunner`-level tests with synthetic fixture upgrades.

### Signature

```ts
interface IParams {
    fixtureDir: string;        // path to a "before/" directory to copy into the tmpdir
    currentVersion: string;
    targetVersion: string;
    upgradesDir?: string;      // defaults to the real src/upgrades
}

interface IHarness extends AsyncDisposable {
    run(): Promise<void>;
    readPackageJson(): PackageJsonFile.Data;
    readFile(relPath: string): string;
    tmpDir: string;
    upWebiny: UpWebiny.Interface;          // real instance, methods spy-wrapped
    upgradeHistory: UpgradeHistory.Interface; // real instance, methods spy-wrapped
    cleanup(): Promise<void>;              // also called by Symbol.asyncDispose
}

export const createUpgradeIntegrationHarness = (params: IParams): IHarness;
```

### Mechanics

1. Create a tmpdir: `await fs.mkdtemp(path.join(os.tmpdir(), 'webiny-upgrade-'))`.
2. Recursively copy `fixtureDir` → tmpdir: `await fs.cp(fixtureDir, tmpDir, { recursive: true })`.
3. Build a DI container scoped to `tmpDir` via `Context.cwd`.
4. Register services per the table below.
5. `run()` resolves `UpgradeHandler` and calls `handle()`.
6. `cleanup()` runs `await fs.rm(tmpDir, { recursive: true, force: true })`. Triggered by `Symbol.asyncDispose` so callers can use `await using harness = ...`.

### Service wiring

| Service | Mode | Notes |
|---|---|---|
| `Context` | Real (constructed by harness) | `cwd = tmpDir`, `installedVersion` & `currentVersion = currentVersion`, `targetVersion = targetVersion` |
| `PackageJsonService` | Real | Reads/writes the tmpdir's `package.json` |
| `PackageJsonTool` | Real | Built on `PackageJsonService` |
| `UpWebiny` | Real (spy-wrapped) | The thing that pins all `@webiny/*` to the final version |
| `UpgradeHistory` | Real (spy-wrapped) | Writes `webiny.history` to the tmpdir's `package.json` |
| `UpgradeHandler` | Real | The class under test |
| `UpgradeRunner` | Real | Loads upgrades from `upgradesDir` |
| `Logger` | Mock | Silent — no test output |
| `Git` | Mock | `isClean → true`, `restore → noop` |
| `PackageManager` | Mock | `install → noop`, `version → undefined` |
| `RegistryService` | Mock | Returns `null` for both methods — no network |
| `DependencyGuard` | Mock | Returns `[]` — no fake `node_modules` tree needed |
| `Input` | Mock | `{ dryRun: false }` |
| `Responder` | Mock | No-op `success`/`error` so the handler doesn't `process.exit` |

Spy wrapping: after constructing the real `UpWebiny` and `UpgradeHistory`, wrap their methods with `vi.spyOn` so tests can assert call counts/args while side effects still run.

### Cross-platform requirements

- `os.tmpdir()` + `fs.mkdtemp` for tmpdir creation.
- `fs.cp` for recursive copy (no shell-outs).
- `fs.rm` for cleanup.
- `path.join` for all paths — never string concatenation, never hardcoded slashes.
- Fixtures must contain plain files only — no symlinks, no executables, no platform-specific line endings that matter for assertions.

## Per-upgrade integration tests

Co-located with each upgrade.

### Layout

```
src/upgrades/<version>/
├── Upgrade.ts
├── Upgrade.test.ts                      ← existing unit test (untouched)
├── Upgrade.integration.test.ts          ← NEW
├── __tests__/
│   ├── mockPackageJsonFile.ts           ← existing (untouched)
│   └── fixtures/
│       └── before/
│           └── package.json             ← minimal "looks like the prior version's project"
└── index.ts
```

### Fixture authoring rules

- **Self-contained.** Each `before/` is hand-written. Not derived from running prior upgrades.
- **Minimal.** Just enough to exercise the upgrade's branches and pin assertions. Not a realistic full project.
- **Independent.** When 6.4.0 ships, its fixture is hand-written from scratch — not assumed to be the post-state of 6.3.0.

### Test shape

```ts
import { describe, it, expect } from "vitest";
import path from "node:path";
import { createUpgradeIntegrationHarness } from "../../__tests__/utils/createUpgradeIntegrationHarness.js";

const fixtureDir = path.join(import.meta.dirname, "__tests__", "fixtures", "before");

describe("Upgrade 6.3.0 - integration", () => {
    it("sets typescript devDependency to 6.0.3 and pins @webiny/* to 6.3.0", async () => {
        await using harness = createUpgradeIntegrationHarness({
            fixtureDir,
            currentVersion: "6.2.0",
            targetVersion: "6.3.0"
        });

        await harness.run();

        const pkg = harness.readPackageJson();
        expect(pkg.devDependencies?.typescript).toBe("6.0.3");
        expect(pkg.dependencies?.["@webiny/cli"]).toBe("6.3.0");
        expect(harness.upgradeHistory.list()).toContainEqual(
            expect.objectContaining({ version: "6.3.0" })
        );
    });
});
```

### Coverage scope (per upgrade)

Each per-upgrade integration test asserts:

1. The upgrade's specific transformations applied (e.g. typescript devDep set).
2. `UpWebiny` ran with the target version (final pinning).
3. `webiny.history` records the upgrade's version.

It does **not** re-test branch logic from `canHandle()` — that's already covered in `Upgrade.test.ts`.

## Chained-run test

A single representative chain that exercises handler chaining against the real `src/upgrades` directory.

### Layout

```
src/__tests__/
├── fixtures/
│   ├── upgrades/...                     ← existing (untouched)
│   ├── invalid-upgrades/...             ← existing (untouched)
│   └── chain/
│       └── before/
│           └── package.json             ← minimal "fresh 6.0.x project" fixture
├── integration/
│   └── chain.test.ts                    ← NEW
└── utils/
    └── createUpgradeIntegrationHarness.ts ← NEW (shared with per-upgrade tests)
```

### Test shape

```ts
import { describe, it, expect } from "vitest";
import path from "node:path";
import { createUpgradeIntegrationHarness } from "../utils/createUpgradeIntegrationHarness.js";

const fixtureDir = path.join(import.meta.dirname, "..", "fixtures", "chain", "before");

describe("Upgrade chain - integration", () => {
    it("runs all shipped upgrades from 6.0.0 to latest in semver order", async () => {
        await using harness = createUpgradeIntegrationHarness({
            fixtureDir,
            currentVersion: "6.0.0",
            targetVersion: "6.3.0"   // bumped as new upgrades ship
        });

        await harness.run();

        const history = harness.upgradeHistory.list();
        expect(history.map(e => e.version)).toEqual(["6.1.0", "6.2.0", "6.3.0"]);

        const pkg = harness.readPackageJson();
        expect(pkg.dependencies?.["@webiny/cli"]).toBe("6.3.0");
        expect(pkg.devDependencies?.typescript).toBe("6.0.3");
    });
});
```

### What this test catches

- Semver ordering of upgrades.
- `UpgradeHistory` skipping logic (none here, but the framework is exercised).
- Final `UpWebiny` pinning runs once after all steps, with the target version.
- Each upgrade's effect persists into the next step (no overwrites).

### Maintenance

- The chain's `targetVersion` and the expected `history`/asserted state must be updated each time a new upgrade ships. This is part of the upgrade-script PR checklist.

## Open questions / out of scope

- **Rollback path.** A failing-upgrade integration test is desirable but out of scope for v1. Add later: a synthetic upgrade in a fixture upgrades dir that throws, assert handler calls `git.restore` and rethrows.
- **Multiple chains.** Adding a second chain (e.g. `6.2.0 → 6.3.0`) is trivial when needed. Not in v1.
- **`DependencyGuard` integration.** Real `DependencyGuard` requires a fake `node_modules/@webiny/cli/files/references.json` tree. Out of scope; mock for now.

## File summary

**New files:**
- `src/__tests__/utils/createUpgradeIntegrationHarness.ts`
- `src/__tests__/integration/chain.test.ts`
- `src/__tests__/fixtures/chain/before/package.json`
- `src/upgrades/6.1.0/Upgrade.integration.test.ts`
- `src/upgrades/6.1.0/__tests__/fixtures/before/package.json`
- `src/upgrades/6.2.0/Upgrade.integration.test.ts`
- `src/upgrades/6.2.0/__tests__/fixtures/before/package.json`
- `src/upgrades/6.3.0/Upgrade.integration.test.ts`
- `src/upgrades/6.3.0/__tests__/fixtures/before/package.json`

**Modified files:** none.
