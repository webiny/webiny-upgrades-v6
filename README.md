# webiny-upgrades-v6

CLI tool that automates upgrading a Webiny project to a target version. It updates all `@webiny/*` package versions in the project's `package.json` and runs the version-specific upgrade script.

## Requirements

- Node.js >= 24

## Usage

```bash
npx https://github.com/webiny/webiny-upgrades-v6 <version> [options]
```

### Example

```bash
npx https://github.com/webiny/webiny-upgrades-v6 6.1.0 --cwd /path/to/my-webiny-project
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `version` | positional | — | Target upgrade version (required, must be valid semver) |
| `--cwd` | string | `process.cwd()` | Path to the Webiny project root |
| `--registry` | string | `https://registry.npmjs.org` | npm registry URL |
| `--debug` | boolean | `false` | Enable verbose debug logging |
| `--force` | boolean | `false` | Re-run upgrade even if already applied (based on installed version) |
| `--package-manager` | string | auto-detect | Package manager to use: `yarn`, `pnpm`, or `npm` (detected from lock file if omitted) |
| `--dry-run` | boolean | `false` | Resolve upgrades and build the pool but do not execute them |
| `--skip-dependency-guard` | boolean | `true` | Skip the dependency guard mismatch check |
| `--install-version` | string | — | Override the npm version written to package.json for `@webiny/*` packages. Use when the upgrade script version differs from the published package version (e.g. `--install-version 0.0.0-unstable.abcde`) |

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

    public async canHandle({ targetVersion, currentVersion }: UpgradeAbstraction.Params): Promise<boolean> {
        return this.version.between(currentVersion, targetVersion);
    }

    public async execute(): Promise<void> {
        // Mutate package.json
        const packageJson = this.packageJsonTool.loadOrThrow();
        packageJson.setDevDependency("some-package", "1.0.0");
        this.packageJsonTool.save(packageJson);

        // Mutate webiny.config.tsx (addChild is duplicate-safe — warns and skips if already present)
        const webinyConfig = this.webinyConfigTool.read();
        webinyConfig.addChild("Infra.Env.IsProd", {
            children: (children) => {
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
