# Upgrade Integration Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add end-to-end integration tests that run real upgrades through the real `UpgradeHandler` against on-disk fixture projects, plus a chained-run test exercising the real `src/upgrades` directory.

**Architecture:** A new test harness (`createUpgradeIntegrationHarness`) copies a fixture directory into a tmpdir, wires a DI container with real `PackageJsonService`/`PackageJsonTool`/`UpWebiny`/`UpgradeHistory`/`UpgradeHandler`/`UpgradeRunner` and mocked `Logger`/`Git`/`PackageManager`/`RegistryService`/`ReferencesService`/`DependencyGuard`/`Input`. Tests call `harness.run()`, then read `package.json` from disk and assert. Cleanup is auto-registered via `vitest.onTestFinished`.

**Tech Stack:** TypeScript, vitest, `@webiny/di`, `node:fs/promises`, `node:fs`, `node:os`, `node:path`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/__tests__/utils/createUpgradeIntegrationHarness.ts` | Create | Harness — tmpdir + container + auto-cleanup |
| `src/upgrades/6.3.0/__tests__/fixtures/before/package.json` | Create | Pre-6.3.0 minimal project fixture |
| `src/upgrades/6.3.0/Upgrade.integration.test.ts` | Create | Per-upgrade integration test for 6.3.0 |
| `src/upgrades/6.2.0/__tests__/fixtures/before/package.json` | Create | Pre-6.2.0 minimal project fixture |
| `src/upgrades/6.2.0/Upgrade.integration.test.ts` | Create | Per-upgrade integration test for 6.2.0 |
| `src/upgrades/6.1.0/__tests__/fixtures/before/package.json` | Create | Pre-6.1.0 minimal project fixture |
| `src/upgrades/6.1.0/Upgrade.integration.test.ts` | Create | Per-upgrade integration test for 6.1.0 |
| `src/__tests__/fixtures/chain/before/package.json` | Create | Fresh-6.0.x minimal fixture for chain test |
| `src/__tests__/integration/chain.test.ts` | Create | Chained-run test (6.0.0 → latest) using real upgrades dir |

No existing files are modified.

---

### Task 1: Create the 6.3.0 fixture

**Files:**
- Create: `src/upgrades/6.3.0/__tests__/fixtures/before/package.json`

Minimal "looks like a 6.2.x project" data — drives the 6.3.0 integration test in Task 2. No code, no test in this task.

- [ ] **Step 1: Create the fixture file**

`src/upgrades/6.3.0/__tests__/fixtures/before/package.json`:

```json
{
    "name": "my-app",
    "version": "1.0.0",
    "packageManager": "yarn@4.10.0",
    "dependencies": {
        "webiny": "6.2.0",
        "@webiny/cli": "6.2.0",
        "@webiny/mcp": "6.2.0",
        "react": "18.3.1",
        "react-dom": "18.3.1"
    },
    "devDependencies": {
        "@types/node": "24.12.2",
        "@types/react": "18.3.28",
        "@types/react-dom": "18.3.7",
        "typescript": "5.0.0"
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/upgrades/6.3.0/__tests__/fixtures/before/package.json
git commit -m "test: add 6.3.0 integration fixture"
```

---

### Task 2: Write the failing 6.3.0 integration test

**Files:**
- Create: `src/upgrades/6.3.0/Upgrade.integration.test.ts`

The harness does not yet exist — the test must fail at import. This is the red step in TDD.

- [ ] **Step 1: Create the test file**

`src/upgrades/6.3.0/Upgrade.integration.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import path from "node:path";
import { createUpgradeIntegrationHarness } from "../../__tests__/utils/createUpgradeIntegrationHarness.js";

const fixtureDir = path.join(import.meta.dirname, "__tests__", "fixtures", "before");

describe("Upgrade 6.3.0 - integration", () => {
    it("sets typescript devDependency to 6.0.3 and pins @webiny/* to 6.3.0", async () => {
        const harness = await createUpgradeIntegrationHarness({
            fixtureDir,
            currentVersion: "6.2.0",
            targetVersion: "6.3.0"
        });

        await harness.run();

        const pkg = harness.readPackageJson();

        expect(pkg.devDependencies?.typescript).toBe("6.0.3");
        expect(pkg.dependencies?.["@webiny/cli"]).toBe("6.3.0");
        expect(pkg.dependencies?.webiny).toBe("6.3.0");
        expect(pkg.dependencies?.["@webiny/mcp"]).toBe("6.3.0");

        expect(harness.upgradeHistory.list()).toContainEqual(
            expect.objectContaining({ version: "6.3.0" })
        );
    });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
yarn test src/upgrades/6.3.0/Upgrade.integration.test.ts
```

Expected: FAIL — module `../../__tests__/utils/createUpgradeIntegrationHarness.js` cannot be resolved.

Do not commit. Move to Task 3.

---

### Task 3: Build the harness

**Files:**
- Create: `src/__tests__/utils/createUpgradeIntegrationHarness.ts`

This is the core piece. It must satisfy the test from Task 2.

- [ ] **Step 1: Create the harness**

`src/__tests__/utils/createUpgradeIntegrationHarness.ts`:

```ts
import { readFileSync } from "node:fs";
import { mkdtemp, cp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { onTestFinished, vi } from "vitest";
import { Container as DIContainer } from "@webiny/di";
import { Container } from "../../base/Container/abstraction.js";
import { Context } from "../../base/Context/abstraction.js";
import { Input } from "../../base/Input/abstraction.js";
import { Logger } from "../../base/Logger/abstraction.js";
import { Version } from "../../base/Version/index.js";
import { Git } from "../../service/Git/abstraction.js";
import { PackageManagerService } from "../../service/PackageManager/abstraction.js";
import { RegistryService } from "../../service/Registry/abstraction.js";
import { PackageJsonService } from "../../service/PackageJson/index.js";
import { ReferencesService } from "../../service/References/index.js";
import { UpgradeHandler } from "../../service/UpgradeHandler/index.js";
import { UpgradeRunner } from "../../service/UpgradeRunner/UpgradeRunner.js";
import { UpgradesDirectory } from "../../service/UpgradeRunner/UpgradesDirectory.js";
import { DependencyGuard } from "../../tool/DependencyGuard/index.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";
import { UpgradeHistory } from "../../tool/UpgradeHistory/index.js";
import { UpWebiny } from "../../tool/UpWebiny/index.js";
import { createMockLogger } from "./mockLogger.js";
import type { PackageJsonFile as PackageJsonFileNS } from "../../service/PackageJson/abstraction.js";

interface IParams {
    fixtureDir: string;
    currentVersion: string;
    targetVersion: string;
    upgradesDir?: string;
}

interface IHarness {
    run(): Promise<void>;
    readPackageJson(): PackageJsonFileNS.Data;
    readFile(relPath: string): string;
    tmpDir: string;
    upWebiny: UpWebiny.Interface;
    upgradeHistory: UpgradeHistory.Interface;
}

const DEFAULT_UPGRADES_DIR = path.join(import.meta.dirname, "..", "..", "upgrades");

export const createUpgradeIntegrationHarness = async (
    params: IParams
): Promise<IHarness> => {
    const upgradesDir = params.upgradesDir ?? DEFAULT_UPGRADES_DIR;
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "webiny-upgrade-"));
    await cp(params.fixtureDir, tmpDir, { recursive: true });

    onTestFinished(async () => {
        await rm(tmpDir, { recursive: true, force: true });
    });

    const container = new DIContainer();
    container.registerInstance(Container, container);

    const ctx: Context.Interface = {
        cwd: tmpDir,
        registry: "https://registry.npmjs.org",
        inputVersion: params.targetVersion,
        targetVersion: Version.create(params.targetVersion),
        installedVersion: Version.create(params.currentVersion),
        currentVersion: Version.create(params.currentVersion),
        setCurrentVersion(version: Version) {
            ctx.currentVersion = version;
        },
        resolve(...segments: string[]) {
            return path.join(tmpDir, ...segments);
        }
    };
    container.registerInstance(Context, ctx);

    container.registerInstance(Logger, createMockLogger());

    container.registerInstance(Input, {
        cwd: tmpDir,
        registry: "https://registry.npmjs.org",
        version: params.targetVersion,
        logLevel: "error",
        json: false,
        forceUpgrade: false,
        skipDependencyGuard: true,
        dryRun: false
    });

    container.registerInstance(Git, {
        isClean: vi.fn().mockResolvedValue(true),
        restore: vi.fn().mockResolvedValue(undefined)
    });

    container.registerInstance(PackageManagerService, {
        install: vi.fn().mockResolvedValue(undefined),
        version: vi.fn()
    });

    container.registerInstance(RegistryService, {
        getLatestVersion: vi.fn().mockResolvedValue(null),
        getVersion: vi.fn().mockResolvedValue(null)
    });

    container.registerInstance(ReferencesService, {
        getReference: vi.fn().mockReturnValue(null),
        getVersion: vi.fn().mockReturnValue(null)
    });

    container.registerInstance(DependencyGuard, {
        execute: vi.fn().mockReturnValue([])
    });

    container.registerInstance(UpgradesDirectory, upgradesDir);

    container.register(PackageJsonService);
    container.register(PackageJsonTool);
    container.register(UpWebiny);
    container.register(UpgradeHistory);
    container.register(UpgradeHandler);
    container.register(UpgradeRunner);

    const upWebiny = container.resolve(UpWebiny);
    vi.spyOn(upWebiny, "execute");

    const upgradeHistory = container.resolve(UpgradeHistory);
    vi.spyOn(upgradeHistory, "add");
    vi.spyOn(upgradeHistory, "get");
    vi.spyOn(upgradeHistory, "list");
    vi.spyOn(upgradeHistory, "remove");

    return {
        async run() {
            const runner = container.resolve(UpgradeRunner);
            await runner.run();
        },
        readPackageJson(): PackageJsonFileNS.Data {
            const raw = readFileSync(path.join(tmpDir, "package.json"), "utf-8");
            return JSON.parse(raw);
        },
        readFile(relPath: string): string {
            return readFileSync(path.join(tmpDir, relPath), "utf-8");
        },
        tmpDir,
        upWebiny,
        upgradeHistory
    };
};
```

Notes:
- `onTestFinished` from vitest auto-cleans the tmpdir after each test — callers don't need explicit cleanup.
- `vi.spyOn` wraps without replacing, so `UpWebiny` and `UpgradeHistory` still execute their real logic against the tmpdir's `package.json`.
- All paths use `path.join` — works on Windows, macOS, Linux.
- `mkdtemp` + `cp` + `rm` from `node:fs/promises` are cross-platform.
- `import.meta.dirname` is supported on Node ≥20.11. Project requires Node ≥24.

- [ ] **Step 2: Verify the harness imports the correct `DependencyGuard` interface**

Open `src/tool/DependencyGuard/index.ts` and confirm the abstraction exposes a `verify` or `execute` method matching what's mocked above. The mock currently provides `execute`. If the actual interface uses `verify`, update the mock object accordingly.

```bash
cat src/tool/DependencyGuard/abstraction.ts
```

If the interface uses a different method name, edit `createUpgradeIntegrationHarness.ts` to match before continuing.

- [ ] **Step 3: Run the 6.3.0 integration test and verify it passes**

```bash
yarn test src/upgrades/6.3.0/Upgrade.integration.test.ts
```

Expected: PASS — one test, no errors.

- [ ] **Step 4: Run the full test suite to verify nothing else broke**

```bash
yarn test
```

Expected: all tests pass (existing unit tests + new integration test).

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/utils/createUpgradeIntegrationHarness.ts src/upgrades/6.3.0/Upgrade.integration.test.ts
git commit -m "test: add upgrade integration harness with 6.3.0 test"
```

---

### Task 4: Add 6.2.0 fixture and integration test

**Files:**
- Create: `src/upgrades/6.2.0/__tests__/fixtures/before/package.json`
- Create: `src/upgrades/6.2.0/Upgrade.integration.test.ts`

The 6.2.0 upgrade sets react/react-dom to 18.3.1 in dependencies and updates several `@types/*` devDeps. Fixture is a "looks like 6.1.x project".

- [ ] **Step 1: Create the fixture**

`src/upgrades/6.2.0/__tests__/fixtures/before/package.json`:

```json
{
    "name": "my-app",
    "version": "1.0.0",
    "packageManager": "yarn@4.10.0",
    "dependencies": {
        "webiny": "6.1.0",
        "@webiny/cli": "6.1.0",
        "@webiny/mcp": "6.1.0",
        "react": "18.2.0",
        "react-dom": "18.2.0"
    },
    "devDependencies": {
        "@types/react": "18.2.79",
        "@types/react-dom": "18.2.25"
    }
}
```

- [ ] **Step 2: Create the integration test**

`src/upgrades/6.2.0/Upgrade.integration.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import path from "node:path";
import { createUpgradeIntegrationHarness } from "../../__tests__/utils/createUpgradeIntegrationHarness.js";

const fixtureDir = path.join(import.meta.dirname, "__tests__", "fixtures", "before");

describe("Upgrade 6.2.0 - integration", () => {
    it("updates react + types and pins @webiny/* to 6.2.0", async () => {
        const harness = await createUpgradeIntegrationHarness({
            fixtureDir,
            currentVersion: "6.1.0",
            targetVersion: "6.2.0"
        });

        await harness.run();

        const pkg = harness.readPackageJson();

        expect(pkg.dependencies?.react).toBe("18.3.1");
        expect(pkg.dependencies?.["react-dom"]).toBe("18.3.1");
        expect(pkg.devDependencies?.["@types/node"]).toBe("24.12.2");
        expect(pkg.devDependencies?.["@types/react"]).toBe("18.3.28");
        expect(pkg.devDependencies?.["@types/react-dom"]).toBe("18.3.7");
        expect(pkg.dependencies?.["@webiny/cli"]).toBe("6.2.0");

        expect(harness.upgradeHistory.list()).toContainEqual(
            expect.objectContaining({ version: "6.2.0" })
        );
    });
});
```

- [ ] **Step 3: Run the test and verify it passes**

```bash
yarn test src/upgrades/6.2.0/Upgrade.integration.test.ts
```

Expected: PASS — one test, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/upgrades/6.2.0/__tests__/fixtures/before/package.json src/upgrades/6.2.0/Upgrade.integration.test.ts
git commit -m "test: add 6.2.0 integration test"
```

---

### Task 5: Add 6.1.0 fixture and integration test

**Files:**
- Create: `src/upgrades/6.1.0/__tests__/fixtures/before/package.json`
- Create: `src/upgrades/6.1.0/Upgrade.integration.test.ts`

The 6.1.0 upgrade moves react/react-dom from devDependencies to dependencies (set to 18.2.0), and adds `@types/react` + `@types/react-dom` devDeps. Fixture is a "looks like 6.0.x project" with react still in devDeps.

- [ ] **Step 1: Create the fixture**

`src/upgrades/6.1.0/__tests__/fixtures/before/package.json`:

```json
{
    "name": "my-app",
    "version": "1.0.0",
    "packageManager": "yarn@4.10.0",
    "dependencies": {
        "webiny": "6.0.0",
        "@webiny/cli": "6.0.0",
        "@webiny/mcp": "6.0.0"
    },
    "devDependencies": {
        "react": "17.0.2",
        "react-dom": "17.0.2"
    }
}
```

- [ ] **Step 2: Create the integration test**

`src/upgrades/6.1.0/Upgrade.integration.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import path from "node:path";
import { createUpgradeIntegrationHarness } from "../../__tests__/utils/createUpgradeIntegrationHarness.js";

const fixtureDir = path.join(import.meta.dirname, "__tests__", "fixtures", "before");

describe("Upgrade 6.1.0 - integration", () => {
    it("moves react to deps, adds @types, pins @webiny/* to 6.1.0", async () => {
        const harness = await createUpgradeIntegrationHarness({
            fixtureDir,
            currentVersion: "6.0.0",
            targetVersion: "6.1.0"
        });

        await harness.run();

        const pkg = harness.readPackageJson();

        expect(pkg.dependencies?.react).toBe("18.2.0");
        expect(pkg.dependencies?.["react-dom"]).toBe("18.2.0");
        expect(pkg.devDependencies?.react).toBeUndefined();
        expect(pkg.devDependencies?.["react-dom"]).toBeUndefined();
        expect(pkg.devDependencies?.["@types/react"]).toBe("18.2.79");
        expect(pkg.devDependencies?.["@types/react-dom"]).toBe("18.2.25");
        expect(pkg.dependencies?.["@webiny/cli"]).toBe("6.1.0");

        expect(harness.upgradeHistory.list()).toContainEqual(
            expect.objectContaining({ version: "6.1.0" })
        );
    });
});
```

- [ ] **Step 3: Run the test and verify it passes**

```bash
yarn test src/upgrades/6.1.0/Upgrade.integration.test.ts
```

Expected: PASS — one test, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/upgrades/6.1.0/__tests__/fixtures/before/package.json src/upgrades/6.1.0/Upgrade.integration.test.ts
git commit -m "test: add 6.1.0 integration test"
```

---

### Task 6: Add chained-run integration test

**Files:**
- Create: `src/__tests__/fixtures/chain/before/package.json`
- Create: `src/__tests__/integration/chain.test.ts`

Runs the real `src/upgrades` directory end-to-end from current 6.0.0 → target 6.3.0, asserting the full chain executes in semver order and final state reflects all three upgrades.

- [ ] **Step 1: Create the chain fixture**

`src/__tests__/fixtures/chain/before/package.json`:

```json
{
    "name": "my-app",
    "version": "1.0.0",
    "packageManager": "yarn@4.10.0",
    "dependencies": {
        "webiny": "6.0.0",
        "@webiny/cli": "6.0.0",
        "@webiny/mcp": "6.0.0"
    },
    "devDependencies": {
        "react": "17.0.2",
        "react-dom": "17.0.2"
    }
}
```

- [ ] **Step 2: Create the chain test**

`src/__tests__/integration/chain.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import path from "node:path";
import { createUpgradeIntegrationHarness } from "../utils/createUpgradeIntegrationHarness.js";

const fixtureDir = path.join(import.meta.dirname, "..", "fixtures", "chain", "before");

describe("Upgrade chain - integration", () => {
    it("runs all shipped upgrades from 6.0.0 to 6.3.0 in semver order", async () => {
        const harness = await createUpgradeIntegrationHarness({
            fixtureDir,
            currentVersion: "6.0.0",
            targetVersion: "6.3.0"
        });

        await harness.run();

        const history = harness.upgradeHistory.list();
        expect(history.map(entry => entry.version)).toEqual(["6.1.0", "6.2.0", "6.3.0"]);

        const pkg = harness.readPackageJson();

        expect(pkg.dependencies?.["@webiny/cli"]).toBe("6.3.0");
        expect(pkg.dependencies?.webiny).toBe("6.3.0");
        expect(pkg.dependencies?.["@webiny/mcp"]).toBe("6.3.0");

        expect(pkg.devDependencies?.typescript).toBe("6.0.3");
        expect(pkg.dependencies?.react).toBe("18.3.1");
        expect(pkg.dependencies?.["react-dom"]).toBe("18.3.1");
        expect(pkg.devDependencies?.react).toBeUndefined();
        expect(pkg.devDependencies?.["react-dom"]).toBeUndefined();
        expect(pkg.devDependencies?.["@types/node"]).toBe("24.12.2");
        expect(pkg.devDependencies?.["@types/react"]).toBe("18.3.28");
        expect(pkg.devDependencies?.["@types/react-dom"]).toBe("18.3.7");
    });
});
```

- [ ] **Step 3: Run the chain test and verify it passes**

```bash
yarn test src/__tests__/integration/chain.test.ts
```

Expected: PASS — one test, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/fixtures/chain/before/package.json src/__tests__/integration/chain.test.ts
git commit -m "test: add chained-run integration test"
```

---

### Task 7: Run the post-task command sequence

After all code changes, run the project's standard post-change check.

- [ ] **Step 1: Run the chained command**

```bash
yarn lint:fix && yarn && yarn build && yarn test
```

Expected: each step exits 0. `yarn test` reports all tests pass (including the 4 new integration tests).

- [ ] **Step 2: If any step fails**

Fix the issue, then re-run the full chain from `yarn lint:fix`. If `lint:fix` made changes, commit them:

```bash
git add -u
git commit -m "chore: lint/format fixes"
```

- [ ] **Step 3: Verify clean working tree**

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

---

## Self-Review Notes

- **Spec coverage:** Harness (✓ Task 3), per-upgrade tests for 6.1.0 / 6.2.0 / 6.3.0 (✓ Tasks 5, 4, 2+3), chained-run test (✓ Task 6), cross-platform tmpdir handling (✓ Task 3), no-network constraint (✓ mocked `RegistryService`), no real install (✓ mocked `PackageManagerService`).
- **Placeholder scan:** All steps include either runnable code, runnable commands, or commits. One step (Task 3 Step 2) asks the implementer to verify a method name on `DependencyGuard` — this is a real check, not a placeholder, because the actual interface name (`verify` vs `execute`) hasn't been confirmed and the harness mock must match.
- **Type consistency:** `Harness` interface fields used in tests (`run`, `readPackageJson`, `upgradeHistory`) all match what Task 3 returns. Fixture filenames consistent across tasks. `currentVersion`/`targetVersion` parameter names consistent.
