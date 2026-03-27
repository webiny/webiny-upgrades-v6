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

## Upgrade.ts

Implement `Upgrade.Interface` — two methods: `canHandle` and `execute`.

`canHandle` returns `true` only when the version matches exactly. Do not use registry checks — the version does not exist on npm yet when the upgrade is being written.

```ts
import { Upgrade } from "~/base/Upgrade/index.js";
import { UpWebiny } from "~/tool/UpWebiny/index.js";
import type { SemVer } from "semver";

class Upgrade620 implements Upgrade.Interface {
    public constructor(private readonly upWebiny: UpWebiny.Interface) {}

    public async canHandle({ version }: { version: SemVer }): Promise<boolean> {
        return version.format() === "6.2.0";
    }

    public async execute(params: Upgrade.Params): Promise<void> {
        await this.upWebiny.execute({
            version: params.version,
            executeYarn: true
        });
        // add version-specific steps here
    }
}

export const Upgrade620Impl = Upgrade.createImplementation({
    implementation: Upgrade620,
    dependencies: [UpWebiny]
});
```

## index.ts

```ts
import { createFeature } from "~/utils/createFeature.js";
import { Upgrade620Impl } from "./Upgrade.js";

export default createFeature({
    name: "Upgrade 6.2.0",
    register(container) {
        container.register(Upgrade620Impl);
    }
});
```

## Available Dependencies

Declare these in the `dependencies` array of `createImplementation`. They are resolved from the DI container automatically.

| Abstraction | Import | Description |
|---|---|---|
| `Context` | `~/base/Context/index.js` | `cwd`, `registry`, `inputVersion`, `targetVersion`, `currentVersion` |
| `Logger` | `~/service/Logger/index.js` | `debug`, `success`, `warning`, `error` |
| `UpWebiny` | `~/tool/UpWebiny/index.js` | Updates all `@webiny/*` packages and optionally runs `yarn install` |
| `PackageJsonService` | `~/service/PackageJson/index.js` | Load and save `package.json` files |
| `NpmService` | `~/service/Npm/index.js` | `getLatestVersion`, `getVersion` from npm registry |
| `Yarn` | `~/service/Yarn/index.js` | `install()`, `version()` |

## Rules

- `canHandle` must match the exact version string — no ranges, no wildcards
- Never check the npm registry in `canHandle` or `execute` — the version does not exist yet
- Always inject dependencies, never instantiate services directly
- `executeYarn: true` unless there is a specific reason to skip installation
