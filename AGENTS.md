# webiny-upgrades-v6

CLI tool that automates upgrading a Webiny project to a target version. It updates all `@webiny/*` package versions and runs the version-specific upgrade script.

## Running

```bash
npx https://github.com/webiny/webiny-upgrades-v6 <version> [--cwd <path>] [--registry <url>] [--debug] [--force] [--dry-run] [--skip-dependency-guard] [--install-version <version>]
```

Entry point: `index.js` → registers tsx loader → `src/index.ts`.

## Architecture

Dependency injection via `@webiny/di`. Everything is an abstraction with an implementation registered into a `Container` via features.

### Layers

| Layer | Location | Purpose |
|---|---|---|
| Base | `src/base/` | Core abstractions: `Application`, `Responder`, `Context`, `Input`, `Upgrade`, `Container`, `Version` |
| Services | `src/service/` | Single-responsibility: `Logger`, `PackageJson`, `PackageManager`, `Registry`, `Git`, `UpgradeHandler`, `UpgradeRunner` |
| Tools | `src/tool/` | Orchestrate services: `UpWebiny`, `PackageJsonTool`, `DependencyGuard`, `UpgradeHistory` |
| Upgrades | `src/upgrades/<version>/` | Version-specific upgrade scripts |

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
  ├─ tools           → Git, UpWebiny, PackageJsonTool, DependencyGuard, UpgradeHistory
  ├─ handler         → UpgradeHandler
  ├─ runner          → UpgradeRunner (loads upgrade scripts dynamically)
  └─ application     → Application

Application.execute()
  ├─ early return if target === installed version
  ├─ runDependencyGuard() — logs warnings if mismatches found
  └─ UpgradeRunner.run()
       ├─ loads src/upgrades/<version>/index.ts
       ├─ registers the upgrade feature into the container
       └─ UpgradeHandler.handle()
            ├─ git.isClean() — aborts if repo is dirty
            ├─ collects upgrades whose canHandle() returns true and not in history
            ├─ if dryRun: returns early (no changes)
            ├─ calls execute() on each in semver order
            ├─ records each step in upgrade history (package.json webiny.history)
            ├─ on failure: git.restore() + rethrow
            ├─ on success: upWebiny.execute(installVersion or targetVersion) to pin final versions
            └─ packageManager.install() (changes left unstaged — no commit)
```

## Available Services

Use relative imports — `~/` aliases are not available in all contexts.

| Abstraction | Location | What it does |
|---|---|---|
| `Context` | `base/Context/index.js` | `cwd`, `registry`, `inputVersion`, `targetVersion`, `installedVersion` (read-once from disk), `currentVersion` (advances after each upgrade step), `setCurrentVersion()`, `resolve()` |
| `Logger` | `base/Logger/index.js` | `debug`, `info`, `warn`, `error`, `fatal`, `done` — standard pino levels + `done` (emits `info` with `{ _done: true }` metadata; JSON transport maps it to `type: "done"`) |
| `PackageJsonService` | `service/PackageJson/index.js` | `load(target: string): PackageJsonFile \| null`, `save(file): void` — low-level load/save for any `package.json` path. See **PackageJsonFile API** below. |
| `PackageManager` | `service/PackageManager/index.js` | `install()`, `version()` — auto-detected from lock file (yarn.lock → pnpm-lock.yaml → package-lock.json); override with `--package-manager` |
| `RegistryService` | `service/Registry/index.js` | `getLatestVersion(name: string): Promise<Version \| null>` — resolves `latest` dist-tag. `getVersion(name: string, version: string \| Version): Promise<Version \| null>` — resolves a specific version. |
| `Git` | `service/Git/index.js` | `isClean()`, `restore()` — used by handler to check for a clean repo and roll back on failure; skips gracefully if cwd is not a git repo |
| `UpWebiny` | `tool/UpWebiny/index.js` | Consolidates all `@webiny/*` packages and bare `webiny` into `dependencies` at the target version (removes from devDependencies/peerDependencies if present); takes `{ version }` only — called by the handler after all upgrade steps to pin the final target version |
| `PackageJsonTool` | `tool/PackageJsonTool/index.js` | Higher-level package.json ops scoped to `cwd`. `load(target?: string): PackageJsonFile \| null`, `save(file): void`. See **PackageJsonFile API** below. |
| `DependencyGuard` | `tool/DependencyGuard/index.js` | `execute(): Mismatch[]` — reads `node_modules/@webiny/cli/files/references.json` (synchronous), compares against user's `package.json` (all four sections), strips ranges, returns `Mismatch[]` where each entry is `{ name, userVersion, expectedVersion }` (empty array = no mismatches). |
| `UpgradeHistory` | `tool/UpgradeHistory/index.js` | `add(version)`, `remove(version)`, `get(version): Entry \| null`, `list(): Entry[]` — reads/writes `webiny.history` array in package.json. Each entry has `{ version, timestamp }`. The handler records each step and skips already-executed upgrades. |
| `Responder` | `base/Responder/index.js` | `success(duration: number, message?: string): never` / `error(message: string, duration: number, error?: Error): never` — terminates the process via `logger.done()` / `logger.fatal()` + `process.exit`. Injectable; `ProcessResponder` is the real implementation. |

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

## Post-Task Sequence

After every change, run these commands in order:

1. `yarn prettier:fix`
2. `yarn eslint:fix`
3. `yarn`
4. `yarn build`
5. `yarn test`

If any step fails, fix the issue and restart from step 1.

## Rules

- No `console.log` — use injected `Logger`
- No direct instantiation of services — use DI
- No exported raw interfaces — only `const` abstraction + `namespace`
- `chalk` is installed but logging goes through `Logger` only
- Type check: `yarn build`
- Windows compatibility: always use `path.join()` / `path.resolve()` for file paths — never string concatenation or hardcoded slashes; use `pathToFileURL()` for dynamic imports
