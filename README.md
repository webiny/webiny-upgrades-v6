# webiny-upgrades-v6

[![CI](https://github.com/webiny/webiny-upgrades-v6/actions/workflows/ci.yml/badge.svg)](https://github.com/webiny/webiny-upgrades-v6/actions/workflows/ci.yml)
[![CodeQL](https://github.com/webiny/webiny-upgrades-v6/actions/workflows/codeql.yml/badge.svg)](https://github.com/webiny/webiny-upgrades-v6/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/webiny/webiny-upgrades-v6/badge)](https://securityscorecards.dev/viewer/?uri=github.com/webiny/webiny-upgrades-v6)

CLI tool that automates upgrading a Webiny project to a target version. It updates all `@webiny/*` package versions in the project's `package.json` and runs the version-specific upgrade script.

## Requirements

- Node.js >= 24

## Usage

```bash
npx https://github.com/webiny/webiny-upgrades-v6 <version> [options]
```

## Options

| Option                    | Type       | Default                      | Description                                                                            |
| ------------------------- | ---------- | ---------------------------- | -------------------------------------------------------------------------------------- |
| `version`                 | positional | `latest`                     | Target upgrade version (valid semver or `latest`).                                     |
| `--cwd`                   | string     | `process.cwd()`              | Path to the Webiny project root.                                                       |
| `--registry`              | string     | `https://registry.npmjs.org` | npm registry URL to resolve versions from.                                             |
| `--force`                 | boolean    | `false`                      | Re-run upgrade even if already recorded in history.                                    |
| `--dry-run`               | boolean    | `false`                      | Resolve upgrades and build the pool but do not execute them.                           |
| `--install-version`       | string     | —                            | Override the version written to `package.json` for `@webiny/*` packages.               |
| `--package-manager`       | string     | auto-detect                  | Package manager to use: `yarn`, `pnpm`, or `npm` (detected from lock file if omitted). |
| `--skip-dependency-guard` | boolean    | `false`                      | Skip the dependency guard mismatch check.                                              |
| `--log-level`             | string     | `debug`                      | Log level: `debug`, `info`, `warning`, or `error`.                                     |
| `--json`                  | boolean    | `false`                      | Output logs as NDJSON (one JSON object per line).                                      |

## Examples

### Upgrade to the latest version

```bash
npx https://github.com/webiny/webiny-upgrades-v6
```

### Upgrade to a specific version

```bash
npx https://github.com/webiny/webiny-upgrades-v6 6.3.0
```

### Target a different project directory

```bash
npx https://github.com/webiny/webiny-upgrades-v6 6.3.0 --cwd /path/to/my-webiny-project
```

### Test against a local npm registry (e.g. Verdaccio)

```bash
npx https://github.com/webiny/webiny-upgrades-v6 0.0.0-local.abc123 \
  --registry=http://localhost:4873 \
  --install-version=0.0.0-local.abc123
```

`--registry` tells the tool where to resolve the version. `--install-version` tells it which version to write into `package.json` for `@webiny/*` packages.

### Install a release candidate

Run the `6.5.0` upgrade script but install RC packages:

```bash
npx https://github.com/webiny/webiny-upgrades-v6 6.5.0 --install-version=6.5.0-rc.1
```

### Re-run an already-applied upgrade

```bash
npx https://github.com/webiny/webiny-upgrades-v6 6.3.0 --force
```

### Dry run (preview without changes)

```bash
npx https://github.com/webiny/webiny-upgrades-v6 6.3.0 --dry-run
```

## Output

When run with `--json`, the tool writes NDJSON to stdout. The final line signals termination:

**Success:**

```json
{ "type": "done", "message": "Upgrade completed in 1.5s." }
```

**Error:**

```json
{ "type": "fatal", "message": "Upgrade failed in 0.3s." }
```

Exit code is `0` on success and `1` on error.

## Upgrade History

Each executed upgrade step is recorded in `package.json` under `webiny.history`:

```json
{
  "webiny": {
    "history": [
      { "version": "6.0.0", "timestamp": "2026-03-31T10:15:00.000Z" },
      { "version": "6.1.0", "timestamp": "2026-03-31T10:15:01.234Z" }
    ]
  }
}
```

Already-executed upgrades are skipped on subsequent runs.

## Adding a new upgrade script

1. Create the directory `src/upgrades/<version>/` (e.g. `src/upgrades/6.2.0/`).
2. Create `Upgrade.ts` implementing `Upgrade.Interface`:

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

  public async canHandle({
    targetVersion,
    currentVersion
  }: UpgradeAbstraction.Params): Promise<boolean> {
    return this.version.between(currentVersion, targetVersion);
  }

  public async execute(): Promise<void> {
    // Mutate package.json
    const packageJson = this.packageJsonTool.loadOrThrow();
    packageJson.setDevDependency("some-package", "1.0.0");
    this.packageJsonTool.save(packageJson);

    // Mutate webiny.config.tsx
    // file.imports.add — add named imports (merges into existing declaration, skips duplicates)
    // file.jsx.addChild — structural merge into existing parents (warns and skips duplicates)
    // file.jsx.insertBefore / insertAfter — position a new element relative to a named sibling
    const webinyConfig = this.webinyConfigTool.read();
    webinyConfig.imports.add({ package: "@webiny/extensions", imports: ["Infra"] });
    webinyConfig.jsx.addChild("Infra.Env.IsProd", {
      children: children => {
        children.addChild("Infra.Encryption", {
          props: { passphrase: 'process.env.WEBINY_ENCRYPTION_PASSPHRASE || ""' }
        });
      }
    });
    this.webinyConfigTool.save(webinyConfig);

    // Do NOT call upWebiny.execute() — the handler pins all @webiny/*
    // packages to the target version after all upgrade steps complete.
  }
}

export const Upgrade = UpgradeAbstraction.createImplementation({
  implementation: UpgradeImpl,
  dependencies: [PackageJsonTool, WebinyConfigTool]
});
```

3. Create `index.ts` that exports the feature as default:

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

The runner will automatically discover and execute the script when `6.2.0` is passed as the target version.

## Modules

### Base (`src/base/`)

| Module                                        | Description                                                                   |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| [Application](src/base/Application/README.md) | Top-level entry point; drives the full upgrade run and exits via `Responder`. |
| [Container](src/base/Container/README.md)     | Makes the DI container itself injectable via a `Container` token.             |
| [Context](src/base/Context/README.md)         | Holds runtime state: `cwd`, versions, `setCurrentVersion`, `resolve`.         |
| [Input](src/base/Input/README.md)             | Parsed CLI flags (`cwd`, `version`, `dryRun`, `forceUpgrade`, etc.).          |
| [Logger](src/base/Logger/README.md)           | pino-backed logging with `pretty` and `json` output modes.                    |
| [Responder](src/base/Responder/README.md)     | Logs final success/error and exits the process with the correct code.         |
| [Timer](src/base/Timer/README.md)             | Wraps async operations with start/end timing instrumentation.                 |
| [Upgrade](src/base/Upgrade/README.md)         | Interface all versioned upgrade steps must implement.                         |
| [Version](src/base/Version/README.md)         | Immutable semver wrapper with comparison helpers and pre-release stripping.   |

### Services (`src/service/`)

| Module                                                 | Description                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| [Git](src/service/Git/README.md)                       | Checks working-tree cleanliness and rolls back changes via `git restore`.      |
| [PackageJson](src/service/PackageJson/README.md)       | Low-level load/mutate/save for any `package.json` file.                        |
| [PackageManager](src/service/PackageManager/README.md) | Auto-detects yarn/pnpm/npm and exposes `install`, `version`, `update`.         |
| [References](src/service/References/README.md)         | Reads `references.json` from `@webiny/cli` for canonical dependency versions.  |
| [Registry](src/service/Registry/README.md)             | Queries an npm registry for latest or specific package versions.               |
| [UpgradeHandler](src/service/UpgradeHandler/README.md) | Orchestrates a single version's upgrade lifecycle with git guard and rollback. |
| [UpgradeRunner](src/service/UpgradeRunner/README.md)   | Discovers and runs versioned upgrade directories in semver order.              |

### Tools (`src/tool/`)

| Module                                                  | Description                                                                 |
| ------------------------------------------------------- | --------------------------------------------------------------------------- |
| [DependencyGuard](src/tool/DependencyGuard/README.md)   | Detects third-party dependency version drift against `references.json`.     |
| [PackageJsonTool](src/tool/PackageJsonTool/README.md)   | Context-aware `PackageJson` wrapper that defaults to the project's `cwd`.   |
| [UpWebiny](src/tool/UpWebiny/README.md)                 | Pins all `@webiny/*` packages to a target version and normalises placement. |
| [UpgradeHistory](src/tool/UpgradeHistory/README.md)     | Persists and queries the upgrade history inside `package.json`.             |
| [WebinyConfigTool](src/tool/WebinyConfigTool/README.md) | Reads and mutates `webiny.config.tsx` via ts-morph AST.                     |
| [YarnrcGuard](src/tool/YarnrcGuard/README.md)           | Enforces required `.yarnrc.yml` security settings before upgrading.         |
