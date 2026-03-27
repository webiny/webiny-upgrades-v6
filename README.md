# @webiny/upgrades-v6

CLI tool that automates upgrading a Webiny project to a target version. It updates all `@webiny/*` package versions in the project's `package.json` and runs the version-specific upgrade script.

## Requirements

- Node.js >= 24
- Yarn

## Usage

```bash
node /path/to/index.js <version> [options]
```

### Example

```bash
node /path/to/index.js 6.1.0 --cwd /path/to/my-webiny-project
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `version` | positional | — | Target upgrade version (required, must be valid semver) |
| `--cwd` | string | `process.cwd()` | Path to the Webiny project root |
| `--registry` | string | `https://registry.npmjs.org` | npm registry URL |
| `--debug` | boolean | `false` | Enable verbose debug logging |

## Output

The tool always writes a single JSON object to stdout and exits.

**Success:**
```json
{ "type": "success", "message": "" }
```

**Error:**
```json
{ "type": "error", "message": "...", "code": "...", "data": { "stack": "..." } }
```

Exit code is `0` on success and `1` on error.

## Adding a new upgrade script

1. Create the directory `src/upgrades/<version>/` (e.g. `src/upgrades/6.2.0/`).
2. Create `Upgrade.ts` implementing `Upgrade.Interface`:

```ts
import { Upgrade } from "~/base/Upgrade/index.js";
import type { SemVer } from "semver";

class Upgrade620 implements Upgrade.Interface {
    public async canHandle({ version }: { version: SemVer }): Promise<boolean> {
        return version.format() === "6.2.0";
    }

    public async execute(params: Upgrade.Params): Promise<void> {
        // upgrade logic here
    }
}
```

3. Create `index.ts` that exports the feature as default:

```ts
import { createFeature } from "~/utils/createFeature.js";
import { Upgrade } from "~/base/Upgrade/index.js";
import { Upgrade620 } from "./Upgrade.js";

export default createFeature({
    name: "Upgrade 6.2.0",
    register(container) {
        container.register(Upgrade.createImplementation({
            implementation: Upgrade620,
            dependencies: []
        }));
    }
});
```

The runner will automatically discover and execute the script when `6.2.0` is passed as the target version.
