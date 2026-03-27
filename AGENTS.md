# webiny-upgrades-v6

CLI tool that automates upgrading a Webiny project to a target version. It updates all `@webiny/*` package versions and runs the version-specific upgrade script.

## Running

```bash
node /path/to/index.js <version> [--cwd <path>] [--registry <url>] [--debug]
```

Entry point: `index.js` → registers tsx loader → `src/index.ts`.

## Architecture

Dependency injection via `@webiny/di`. Everything is an abstraction with an implementation registered into a `Container` via features.

### Layers

| Layer | Location | Purpose |
|---|---|---|
| Base | `src/base/` | Core abstractions: `Context`, `Upgrade`, `UpgradeHandler` |
| Services | `src/service/` | Single-responsibility: `Logger`, `PackageJson`, `Yarn`, `Npm` |
| Tools | `src/tool/` | Orchestrate services: `UpWebiny` |
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

### Boot sequence (`src/index.ts`)

```
createContainer()           → registers Logger
registerContext(container)  → registers PackageJson, Yarn, Npm, Context
UpWebinyFeature.register()
dynamic import upgrades/<version>/index.ts
container.resolve(UpgradeHandler) → handle()
```

## Available Services

| Abstraction | Import | What it does |
|---|---|---|
| `Context` | `~/base/Context/index.js` | `cwd`, `registry`, `inputVersion`, `targetVersion`, `currentVersion` |
| `Logger` | `~/service/Logger/index.js` | `debug`, `success`, `warning`, `error` (pino + pino-pretty) |
| `PackageJsonService` | `~/service/PackageJson/index.js` | Load/save `package.json` files |
| `Yarn` | `~/service/Yarn/index.js` | `install()`, `version()` |
| `NpmService` | `~/service/Npm/index.js` | `getLatestVersion()`, `getVersion()` |
| `UpWebiny` | `~/tool/UpWebiny/index.js` | Updates all `@webiny/*` deps + runs yarn |

## Writing an Upgrade Script

Use the `/write-upgrade` skill (`.claude/skills/write-upgrade/SKILL.md`).

Short version:

1. Create `src/upgrades/<version>/Upgrade.ts` — implement `Upgrade.Interface` (`canHandle` + `execute`)
2. Create `src/upgrades/<version>/index.ts` — default export a `createFeature` that registers the implementation
3. `canHandle` must match the exact version string — no registry checks, the version does not exist on npm yet

## Rules

- No `console.log` — use injected `Logger`
- No direct instantiation of services — use DI
- No exported raw interfaces — only `const` abstraction + `namespace`
- `chalk` is installed but logging goes through `Logger` only
- Type check: `yarn build`
