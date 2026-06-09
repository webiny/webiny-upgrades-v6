# webiny-upgrades-v6

> **Documentation rule:** If you modify any code inside `src/base/`, `src/service/`, or `src/tool/`, you **must** update the `README.md` in that module's folder. If you add a new public export, update the API table. If you change behaviour, update the description and usage example. Do not leave READMEs stale.

CLI tool that automates upgrading a Webiny project to a target version. It updates all `@webiny/*` package versions and runs the version-specific upgrade script.

## Running

```bash
npx https://github.com/webiny/webiny-upgrades-v6 <version> [--cwd <path>] [--registry <url>] [--debug] [--force] [--dry-run] [--skip-dependency-guard] [--install-version <version>]
```

Entry point: `index.js` → registers tsx loader → `src/index.ts`.

## Architecture

Dependency injection via `@webiny/di`. Everything is an abstraction with an implementation registered into a `Container` via features.

### Layers

| Layer    | Location                  | Purpose                                                                                                                     |
| -------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Base     | `src/base/`               | Core abstractions: `Application`, `Responder`, `Context`, `Input`, `Upgrade`, `Container`, `Version`                        |
| Services | `src/service/`            | Single-responsibility: `Logger`, `PackageJson`, `PackageManager`, `Registry`, `Git`, `UpgradeHandler`, `UpgradeRunner`      |
| Tools    | `src/tool/`               | Orchestrate services: `UpWebiny`, `PackageJsonTool`, `WebinyConfigTool`, `DependencyGuard`, `YarnrcGuard`, `UpgradeHistory` |
| Upgrades | `src/upgrades/<version>/` | Version-specific upgrade scripts                                                                                            |

### Patterns

Every module follows the same four-file structure:

```
abstraction.ts   — private interface, exports only `const Foo` and `namespace Foo`
FooImpl.ts       — class implementing Foo.Interface
feature.ts       — FooFeature with register(container, params?)
index.ts         — re-exports abstraction + feature
```

**Never export the raw interface** — consumers use `Foo.Interface`, `Foo.Params` etc. via the namespace.

**Never instantiate services directly** — always declare them as `dependencies` in `createImplementation` and receive them via constructor injection.

### Boot sequence

`src/index.ts` is two lines — everything happens inside `createContainer()` and `Application.execute()`.

```
createContainer()  (async, src/container.ts)
  ├─ infrastructure  → Logger, Input
  ├─ responder       → Responder (handles process exit and done signal)
  ├─ services        → PackageJson, PackageManager, Registry, References
  ├─ context         → resolves target version from npm registry, registers Context
  ├─ tools           → Git, UpWebiny, PackageJsonTool, WebinyConfigTool, DependencyGuard, YarnrcGuard, UpgradeHistory
  ├─ handler         → UpgradeHandler
  ├─ runner          → UpgradeRunner (loads upgrade scripts dynamically)
  └─ application     → Application

Application.execute()
  ├─ early return if target === installed version
  ├─ YarnrcGuard.execute() — info if target < 6.5.0, hard-abort if ≥ 6.5.0
  ├─ UpgradeRunner.run()
  │    ├─ loads src/upgrades/<version>/index.ts
  │    ├─ registers the upgrade feature into the container
  │    └─ UpgradeHandler.handle()
  │         ├─ git.isClean() — aborts if repo is dirty
  │         ├─ collects upgrades whose canHandle() returns true and not in history
  │         ├─ if pool non-empty and dryRun: returns early (no changes)
  │         ├─ if pool non-empty: calls execute() on each in semver order
  │         ├─ records each step in upgrade history (package.json webiny.history)
  │         ├─ on failure: git.restore() + rethrow
  │         ├─ upWebiny.execute(installVersion or targetVersion) to pin final versions (always runs)
  │         ├─ packageManager.install() (always runs)
  │         ├─ referencesService.clearCache() — discard stale references.json cache
  │         ├─ upWebiny.reconcile() — pin independently-versioned packages (di, stdlib, wts-client) from fresh references.json
  │         ├─ packageManager.install() — reconcile lockfile (fast, only removes/adjusts)
  │         └─ records target version in upgrade history (always, deduped)
  └─ runDependencyGuard() — logs warnings if mismatches found
```

## Available Services

Use relative imports — `~/` aliases are not available in all contexts.

| Abstraction             | Location                          | What it does                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Context`               | `base/Context/index.js`           | `cwd`, `registry`, `inputVersion`, `targetVersion`, `installedVersion` (read-once from disk), `currentVersion` (advances after each upgrade step), `setCurrentVersion()`, `resolve()`                                                                                                                                                                                                                                               |
| `Logger`                | `base/Logger/index.js`            | `debug`, `info`, `warn`, `error`, `fatal`, `done` — standard pino levels + `done` (emits `info` with `{ _done: true }` metadata; JSON transport maps it to `type: "done"`)                                                                                                                                                                                                                                                          |
| `PackageJsonService`    | `service/PackageJson/index.js`    | `load(target: string): PackageJsonFile \| null`, `loadOrThrow(target: string): PackageJsonFile` (throws on failure — **prefer this over `load` + null guard**), `save(file): void` — low-level load/save for any `package.json` path. See **PackageJsonFile API** below.                                                                                                                                                            |
| `PackageManagerService` | `service/PackageManager/index.js` | `install()`, `version()`, `name(): "yarn" \| "pnpm" \| "npm"` — higher-level wrapper; `name()` returns the detected package manager for the project. Auto-detected from lock file (yarn.lock → pnpm-lock.yaml → package-lock.json); override with `--package-manager`                                                                                                                                                               |
| `RegistryService`       | `service/Registry/index.js`       | `getLatestVersion(name: string): Promise<Version \| null>` — resolves `latest` dist-tag. `getVersion(name: string, version: string \| Version): Promise<Version \| null>` — resolves a specific version.                                                                                                                                                                                                                            |
| `ReferencesService`     | `service/References/index.js`     | `getReference(name): IReference \| null`, `getVersion(name): string \| null` — looks up canonical package versions from `references.json`. `clearCache()` — discards the in-memory cache so the next call re-reads from disk (needed after install).                                                                                                                                                                                |
| `Git`                   | `service/Git/index.js`            | `isClean()`, `restore()` — used by handler to check for a clean repo and roll back on failure; skips gracefully if cwd is not a git repo                                                                                                                                                                                                                                                                                            |
| `UpWebiny`              | `tool/UpWebiny/index.js`          | `execute({ version })` consolidates all `@webiny/*` packages and bare `webiny` into `dependencies` at the target version (removes from devDependencies/peerDependencies if present). `reconcile()` pins independently-versioned packages (`@webiny/di`, `@webiny/stdlib`, `@webiny/wts-client`) to the versions from `references.json`. Both are sync methods called by the handler — upgrades must **not** call either themselves. |
| `PackageJsonTool`       | `tool/PackageJsonTool/index.js`   | Higher-level package.json ops scoped to `cwd`. `load(target?: string): PackageJsonFile \| null`, `loadOrThrow(target?: string): PackageJsonFile` (throws on failure — **prefer this over `load` + null guard**), `save(file): void`. See **PackageJsonFile API** below.                                                                                                                                                             |
| `WebinyConfigTool`      | `tool/WebinyConfigTool/index.js`  | Reads and mutates `webiny.config.tsx` via ts-morph AST. `read(): WebinyConfigFile` (throws if file not found), `save(file): void`. The returned file exposes `file.imports` and `file.jsx` sub-objects. See **WebinyConfigFile API** below.                                                                                                                                                                                         |
| `DependencyGuard`       | `tool/DependencyGuard/index.js`   | `execute(): Mismatch[]` — reads `node_modules/@webiny/cli/files/references.json` (synchronous), compares against user's `package.json` (all four sections), strips ranges, returns `Mismatch[]` where each entry is `{ name, userVersion, expectedVersion }` (empty array = no mismatches).                                                                                                                                         |
| `YarnrcGuard`           | `tool/YarnrcGuard/index.js`       | `execute({ targetVersion, breakOnVersion }): void` — reads `.yarnrc.yml` from `cwd`, checks four required security settings (`approvedGitRepositories`, `enableScripts`, `npmMinimalAgeGate`, `npmPreapprovedPackages`). Logs info when `targetVersion < breakOnVersion`; throws `YarnrcGuardError` when `targetVersion >= breakOnVersion`.                                                                                         |
| `UpgradeHistory`        | `tool/UpgradeHistory/index.js`    | `add(version)`, `remove(version)`, `get(version): Entry \| null`, `list(): Entry[]` — reads/writes `webiny.history` array in package.json. Each entry has `{ version, timestamp }`. The handler records each step and skips already-executed upgrades.                                                                                                                                                                              |
| `Responder`             | `base/Responder/index.js`         | `success(duration: number, message?: string): never` / `error(message: string, duration: number, error?: Error): never` — terminates the process via `logger.done()` / `logger.fatal()` + `process.exit`. Injectable; `ProcessResponder` is the real implementation.                                                                                                                                                                |

### WebinyConfigFile API

The object returned by `WebinyConfigTool.read()`:

```ts
// imports sub-object
file.imports.add(options: ImportOptions): void
file.imports.remove(options: RemoveImportOptions): void

// jsx sub-object
file.jsx.addChild(tag: string, options?: ChildOptions): void
file.jsx.insertBefore(ref: string, tag: string, options?: ChildOptions): void
file.jsx.insertAfter(ref: string, tag: string, options?: ChildOptions): void

// file
file.save(): void

type ImportEntry = string | Record<string, string>;
interface ImportOptions {
    package: string;
    imports: ImportEntry[];        // plain string or { originalName: localAlias }
}

interface RemoveImportOptions {
    package: string;
    imports?: string[];            // omit to remove the entire declaration
}

interface ChildOptions {
    comment?: string;                       // renders as {/* comment */} above the element
    props?: Record<string, string>;         // expression syntax: { passphrase: 'process.env.X || ""' }
    children?: (jsx: Jsx) => void;          // nested children callback
}
```

`jsx.addChild` behaviour:

- **Not found** → inserts self-closing or block element after the last JSX fragment child
- **Found, no `children` callback** → logs a warning and skips (duplicates are never added)
- **Found, `children` callback provided** → structural merge: recurses into the existing element so each nested `addChild` applies the same logic one level deeper

`jsx.insertBefore(ref, tag, options)` / `jsx.insertAfter(ref, tag, options)` behaviour:

- **`ref` not found** → warns (`<ref> not found, inserting <tag> at end`) and falls back to append
- **`tag` already exists** → warns and no-ops — **no** structural merge even if `options.children` is provided; use `addChild` for structural merge
- **Normal path** → inserts `tag` immediately before / after the first occurrence of `ref` among direct children; indent is inferred from `ref`'s column offset
- Both methods are available at every nesting level via the `Jsx` object passed to `addChild`'s `children` callback

Example — imports + top-level positioning:

```ts
const webinyConfig = this.webinyConfigTool.read();
webinyConfig.imports.add({ package: "@webiny/extensions", imports: ["Infra"] });
webinyConfig.jsx.insertBefore("ProjectAws", "Infra.Env.IsProd", {
  comment: "Encryption MUST always be configured for production environments.",
  children: children => {
    children.addChild("Infra.Encryption", {
      props: { passphrase: 'process.env.WEBINY_ENCRYPTION_PASSPHRASE || ""' }
    });
  }
});
this.webinyConfigTool.save(webinyConfig);
```

Example — nested positioning via `addChild` structural merge:

```ts
webinyConfig.jsx.addChild("Infra.Env.IsProd", {
  children: b => {
    b.insertAfter("Infra.Encryption", "Infra.NewFeature");
  }
});
```

### PackageJsonFile API

The object returned by `PackageJsonTool.load()` or `PackageJsonService.load()`:

```ts
// read all
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

## Writing an Upgrade Script

Use the `/write-upgrade` skill (`.claude/skills/write-upgrade/SKILL.md`).

Short version:

1. Create `src/upgrades/<version>/Upgrade.ts` — implement `Upgrade.Interface` (`canHandle` + `execute`)
2. Create `src/upgrades/<version>/index.ts` — default export a `createFeature` that registers the implementation
3. `canHandle` receives `{ targetVersion, currentVersion }` — return `this.version.between(currentVersion, targetVersion)`. The handler collects all matching upgrades into a pool (skipping those already in history) and runs them in order.
4. `execute` takes no params — perform version-specific transformations (e.g. add/remove deps, modify config). Do **not** call `upWebiny.execute()` — the handler pins all `@webiny/*` packages to the target version after all steps complete.
5. The project must have a clean git repo before running — the handler checks this and aborts if dirty; on success file changes are left unstaged for the user to review and commit

### Fix upgrades

To ship a bugfix for an already-released upgrade (e.g. `6.1.0`), create a new upgrade with a pre-release version like `6.1.0-fix.0`. History matching is exact on `version.raw`, so `6.1.0-fix.0` will run even when `6.1.0` is already in history. The `between()` check also handles this correctly — `6.1.0-fix.0` normalises to `6.1.0` for the upper bound, and raw semver places it after `6.1.0` for the lower bound.

## Testing

Vitest is the test runner. Scripts:

- `yarn test` — single run
- `yarn test:watch` — watch mode
- `yarn test:coverage` — with coverage report and threshold enforcement

### Layout

- **Unit tests** sit next to the source file (`Foo.ts` → `Foo.test.ts`). Use DI mocks for dependencies.
- **Integration tests** for upgrades sit at `src/upgrades/<version>/Upgrade.integration.test.ts`. They run the real `UpgradeHandler` + `UpgradeRunner` pipeline against an on-disk fixture project copied into a tmpdir.
- **Chained-run test** at `src/__tests__/integration/chain.test.ts` runs multiple upgrades end-to-end against the real `src/upgrades` directory. Update its assertions when a new upgrade ships.

### Shared test helpers (`src/__tests__/utils/`)

| Helper                                  | Purpose                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createUpgradeIntegrationHarness`       | Integration harness — tmpdir + real services + auto-cleanup via `vitest.onTestFinished`. Returns `{ run, readPackageJson, readFile, upWebiny, upgradeHistory, tmpDir }`                                                                                                                                                                                       |
| `createIntegrationContainer`            | `UpgradeRunner`-level test container (synthetic fixture upgrades, mocked services). Used by `UpgradeRunner.test.ts`                                                                                                                                                                                                                                           |
| `createMockPackageJsonFile(overrides?)` | Canonical in-memory `PackageJsonFile` with sensible defaults. **Do not duplicate per-upgrade** — pass `overrides` for customisation                                                                                                                                                                                                                           |
| `createMockLogger()`                    | Silent `Logger.Interface` with `vi.fn()` for every level                                                                                                                                                                                                                                                                                                      |
| `registerUpgradeDeps(container, file)`  | Registers mock `PackageJsonTool`, `ReferencesService`, `PackageManagerService` (defaults to `name() → "yarn"`), and `Context` (`cwd="/project"`, `resolve()` joins from `/project`) for upgrade unit tests. Does **not** register `WebinyConfigTool` — tests that need it must register a mock instance themselves (see `src/upgrades/6.3.0/Upgrade.test.ts`) |

### Fixtures

- Per-upgrade integration fixtures: `src/upgrades/<version>/__tests__/fixtures/before/package.json` — hand-written, minimal, self-contained (not derived from prior upgrade states).
- Chain fixture: `src/__tests__/fixtures/chain/before/package.json`.
- `UpgradeRunner` fixtures: `src/__tests__/fixtures/upgrades/` and `src/__tests__/fixtures/invalid-upgrades/`.

### Coverage thresholds

Enforced in `vitest.config.ts`: 100% statements, functions, and lines; 98% branches. Failing to meet any floor fails `yarn test:coverage`.

When coverage gaps appear, apply one of two approaches — never mix them:

- **Unreachable defensive guards** (null checks that protect against states proven impossible by the call site, e.g. re-querying an already-verified fragment): suppress with `/* v8 ignore next */` (single line) or `/* v8 ignore start */` / `/* v8 ignore stop */` (block). Leave a short comment explaining why the branch is unreachable only when it isn't obvious from context.
- **Reachable but untested code** (empty container paths, exotic node types, etc.): write a focused test. Do not suppress reachable code with ignore comments.

### Global test setup

`vitest.setup.ts` bumps `process.setMaxListeners(50)` to silence the pino/exit-listener warning that fires when many test files share a process.

## Post-Task Sequence

After every change, run:

```bash
yarn && yarn build && yarn adio:check && yarn format:fix && yarn lint:fix && yarn test:coverage
```

(install → type-check → dependency sync check → format → eslint --fix → tests with coverage.) If any step fails, fix the issue and re-run the full chain.

## Rules

- No `console.log` — use injected `Logger`. The only exception is `src/utils/userInput.ts` (runs before `Logger` is constructed); comment is in place there.
- No direct instantiation of services — use DI
- No exported raw interfaces — only `const` abstraction + `namespace`
- `chalk` is installed but logging goes through `Logger` only
- Type check: `yarn build`
- Prefer `loadOrThrow()` over `load()` + null guard when throwing on null immediately
- Windows compatibility: always use `path.join()` / `path.resolve()` for file paths — never string concatenation or hardcoded slashes; use `pathToFileURL()` for dynamic imports
- **Docs must be updated with every feature** — after implementing any new tool, service, or capability, update `AGENTS.md` (Available Services table + API section), `README.md` (upgrade script example if applicable), and `.claude/skills/write-upgrade/SKILL.md` (Available Dependencies table). No feature ships without its docs.
