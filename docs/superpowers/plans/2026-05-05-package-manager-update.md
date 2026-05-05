# PackageManagerService.update(version) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `update(version: string): Promise<void>` to the `PackageManager` and `PackageManagerService` interfaces so yarn, npm, and pnpm each know how to update themselves, then simplify the 6.3.0 upgrade to use it.

**Architecture:** `update()` follows the exact same delegation pattern as `install()` — the service wraps the underlying package manager in a timer + log, each concrete class runs the appropriate shell command. The 6.3.0 upgrade drops its manual binary copy logic and calls `packageManagerService.update("4.x.x")` instead.

**Tech Stack:** TypeScript, execa, vitest, @webiny/di

---

### Task 1: Extend the `IPackageManager` and `IPackageManagerService` interfaces

**Files:**
- Modify: `src/service/PackageManager/abstraction.ts`

- [ ] **Step 1: Add `update()` to `IPackageManager`**

Replace the `IPackageManager` interface and its namespace in `src/service/PackageManager/abstraction.ts`:

```ts
interface IPackageManager {
    install(): Promise<void>;
    version(): Promise<Version>;
    update(version: string): Promise<void>;
}

export const PackageManager = createAbstraction<IPackageManager>("Service/PackageManager");

export namespace PackageManager {
    export type Interface = IPackageManager;
    export type InstallResponse = Promise<void>;
    export type VersionResponse = Promise<Version>;
    export type UpdateResponse = Promise<void>;
}
```

- [ ] **Step 2: Add `update()` to `IPackageManagerService`**

Replace the `IPackageManagerService` interface and its namespace:

```ts
interface IPackageManagerService {
    install(): Promise<void>;
    version(): Promise<Version>;
    name(): IPackageManagerName;
    update(version: string): Promise<void>;
}

export const PackageManagerService = createAbstraction<IPackageManagerService>(
    "Service/PackageManagerService"
);

export namespace PackageManagerService {
    export type Interface = IPackageManagerService;
    export type InstallResponse = Promise<void>;
    export type VersionResponse = Promise<Version>;
    export type UpdateResponse = Promise<void>;
}
```

- [ ] **Step 3: Verify TypeScript compiles (it will fail — that's expected)**

Run: `yarn build`
Expected: Errors that `update` is not implemented in `YarnImpl`, `NpmImpl`, `PnpmImpl`, and `PackageManagerServiceImpl`. This confirms the interface change propagated correctly.

---

### Task 2: Implement `update()` in `YarnPackageManager`

**Files:**
- Modify: `src/service/PackageManager/YarnPackageManager.ts`
- Test: `src/service/PackageManager/PackageManagerService.test.ts` (covered in Task 5)

- [ ] **Step 1: Add `update()` to `YarnImpl`**

```ts
class YarnImpl implements PackageManagerAbstraction.Interface {
    public constructor(private readonly logger: Logger.Interface) {}

    public async install(): Promise<void> {
        try {
            await execa("yarn", [], { stdio: "inherit" });
        } catch (ex: any) {
            this.logger.error(ex.message);
            throw ex;
        }
    }

    public async version(): Promise<Version> {
        const { stdout } = await execa("yarn", ["--version"]);
        return Version.create(stdout.trim());
    }

    public async update(version: string): Promise<void> {
        try {
            await execa("yarn", ["set", "version", version], { stdio: "inherit" });
        } catch (ex: any) {
            this.logger.error(ex.message);
            throw ex;
        }
    }
}
```

---

### Task 3: Implement `update()` in `NpmPackageManager`

**Files:**
- Modify: `src/service/PackageManager/NpmPackageManager.ts`

- [ ] **Step 1: Add `update()` to `NpmImpl`**

```ts
class NpmImpl implements PackageManagerAbstraction.Interface {
    public constructor(private readonly logger: Logger.Interface) {}

    public async install(): Promise<void> {
        try {
            await execa("npm", ["install"], { stdio: "inherit" });
        } catch (ex: any) {
            this.logger.error(ex.message);
            throw ex;
        }
    }

    public async version(): Promise<Version> {
        const { stdout } = await execa("npm", ["--version"]);
        return Version.create(stdout.trim());
    }

    public async update(version: string): Promise<void> {
        try {
            await execa("npm", ["install", "-g", `npm@${version}`], { stdio: "inherit" });
        } catch (ex: any) {
            this.logger.error(ex.message);
            throw ex;
        }
    }
}
```

---

### Task 4: Implement `update()` in `PnpmPackageManager`

**Files:**
- Modify: `src/service/PackageManager/PnpmPackageManager.ts`

- [ ] **Step 1: Add `update()` to `PnpmImpl`**

```ts
class PnpmImpl implements PackageManagerAbstraction.Interface {
    public constructor(private readonly logger: Logger.Interface) {}

    public async install(): Promise<void> {
        try {
            await execa("pnpm", ["install"], { stdio: "inherit" });
        } catch (ex: any) {
            this.logger.error(ex.message);
            throw ex;
        }
    }

    public async version(): Promise<Version> {
        const { stdout } = await execa("pnpm", ["--version"]);
        return Version.create(stdout.trim());
    }

    public async update(_version: string): Promise<void> {
        throw new Error("Updating pnpm via PackageManagerService is not supported yet.");
    }
}
```

---

### Task 5: Implement `update()` in `PackageManagerServiceImpl` and update the mock

**Files:**
- Modify: `src/service/PackageManager/PackageManagerService.ts`
- Modify: `src/__tests__/utils/mockUpgradeDeps.ts`

- [ ] **Step 1: Add `update()` to `PackageManagerServiceImpl`**

The full updated class in `src/service/PackageManager/PackageManagerService.ts`:

```ts
class PackageManagerServiceImpl implements PackageManagerServiceAbstraction.Interface {
    constructor(
        private readonly packageManager: PackageManager.Interface,
        private readonly timer: Timer.Interface,
        private readonly logger: Logger.Interface,
        private readonly pmName: IPackageManagerName
    ) {}

    public async install(): PackageManagerServiceAbstraction.InstallResponse {
        this.logger.info("Installing packages...");
        await this.timer.execute("PackageManagerService.install", async () => {
            return await this.packageManager.install();
        });
    }

    public async version(): PackageManagerServiceAbstraction.VersionResponse {
        return await this.packageManager.version();
    }

    public name(): IPackageManagerName {
        return this.pmName;
    }

    public async update(version: string): PackageManagerServiceAbstraction.UpdateResponse {
        this.logger.info("Updating package manager...");
        await this.timer.execute("PackageManagerService.update", async () => {
            return await this.packageManager.update(version);
        });
    }
}
```

- [ ] **Step 2: Add `update` to the mock in `mockUpgradeDeps.ts`**

In `registerUpgradeDeps`, update the `PackageManagerService` mock registration:

```ts
container.registerInstance(PackageManagerService, {
    install: vi.fn().mockResolvedValue(undefined),
    version: vi.fn(),
    name: vi.fn().mockReturnValue("yarn"),
    update: vi.fn().mockResolvedValue(undefined)
});
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `yarn build`
Expected: No errors.

---

### Task 6: Test `PackageManagerService.update()`

**Files:**
- Modify: `src/service/PackageManager/PackageManagerService.test.ts`

- [ ] **Step 1: Add `update` to the mock `packageManager` in `createContainer`**

Update the `packageManager` mock object (around line 17) to include `update`:

```ts
const packageManager: PackageManager.Interface = {
    install: vi.fn().mockResolvedValue(undefined),
    version: vi.fn().mockResolvedValue(Version.create("4.1.0")),
    update: vi.fn().mockResolvedValue(undefined)
};
```

- [ ] **Step 2: Write failing tests for `update()`**

Add a new `describe("update", ...)` block at the end of the test file:

```ts
describe("update", () => {
    it("delegates to packageManager.update with the given version", async () => {
        const { container, packageManager } = createContainer();
        const service = container.resolve(PackageManagerServiceToken);

        await service.update("4.14.1");

        expect(packageManager.update).toHaveBeenCalledWith("4.14.1");
    });

    it("logs before updating", async () => {
        const { container, logger } = createContainer();
        const service = container.resolve(PackageManagerServiceToken);

        await service.update("4.14.1");

        expect(logger.info).toHaveBeenCalledWith("Updating package manager...");
    });

    it("wraps update in a timer", async () => {
        const { container, timer } = createContainer();
        const service = container.resolve(PackageManagerServiceToken);

        await service.update("4.14.1");

        expect(timer.execute).toHaveBeenCalledWith(
            "PackageManagerService.update",
            expect.any(Function)
        );
    });
});
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `yarn test src/service/PackageManager/PackageManagerService.test.ts`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/service/PackageManager/abstraction.ts \
        src/service/PackageManager/YarnPackageManager.ts \
        src/service/PackageManager/NpmPackageManager.ts \
        src/service/PackageManager/PnpmPackageManager.ts \
        src/service/PackageManager/PackageManagerService.ts \
        src/service/PackageManager/PackageManagerService.test.ts \
        src/__tests__/utils/mockUpgradeDeps.ts
git commit -m "feat: add PackageManagerService.update(version)"
```

---

### Task 7: Update the 6.3.0 upgrade

**Files:**
- Modify: `src/upgrades/6.3.0/Upgrade.ts`
- Modify: `src/upgrades/6.3.0/Upgrade.test.ts`

- [ ] **Step 1: Write the failing test first**

First, update `createContainer` in `src/upgrades/6.3.0/Upgrade.test.ts` to include `update` on the inline `PackageManagerService` mock (it overrides `registerUpgradeDeps`):

```ts
const createContainer = (
    file: PackageJsonFile.Interface | null = createMockPackageJsonFile(),
    pmName: PackageManagerName = "yarn"
) => {
    const container = new Container();
    registerUpgradeDeps(container, file);
    container.registerInstance(PackageManagerService, {
        install: vi.fn(),
        version: vi.fn(),
        name: vi.fn().mockReturnValue(pmName),
        update: vi.fn().mockResolvedValue(undefined)
    });
    container.register(Upgrade630);
    return container;
};
```

Then delete the old yarn-specific tests (`"updates packageManager when binary is found"`, `"copies yarn binary"`, `"skips copying yarn binary"`, `"updates yarnPath in .yarnrc.yml"`, `"skips updating .yarnrc.yml"`, `"skips packageManager update when binaries directory does not exist"`, `"skips packageManager update when no yarn binary found"`) and replace with:

```ts
it("calls packageManagerService.update when project uses yarn", async () => {
    const container = createContainer(createMockPackageJsonFile(), "yarn");
    const packageManagerService = container.resolve(PackageManagerService);
    const upgrade = container.resolve(Upgrade);

    await upgrade.execute();

    expect(packageManagerService.update).toHaveBeenCalledWith("4.14.1");
});

it("does not call packageManagerService.update when project does not use yarn", async () => {
    const container = createContainer(createMockPackageJsonFile(), "npm");
    const packageManagerService = container.resolve(PackageManagerService);
    const upgrade = container.resolve(Upgrade);

    await upgrade.execute();

    expect(packageManagerService.update).not.toHaveBeenCalled();
});
```

Also remove these imports that are no longer needed from the top of the test file:
- `path` (default import)
- `vi.mock("node:fs")`
- `import fs from "node:fs"`
- `BIN_DIR`, `RELEASES_DIR`, `YARNRC_PATH` constants

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test src/upgrades/6.3.0/Upgrade.test.ts`
Expected: New tests fail because `update` is not called yet.

- [ ] **Step 3: Simplify the 6.3.0 upgrade implementation**

Replace `src/upgrades/6.3.0/Upgrade.ts` with:

```ts
import { Upgrade as UpgradeAbstraction } from "../../base/Upgrade/index.js";
import { Context } from "../../base/Context/index.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";
import { PackageManagerService } from "../../service/PackageManager/index.js";
import { Version } from "../../base/Version/index.js";

class UpgradeImpl implements UpgradeAbstraction.Interface {
    public readonly version = Version.create("6.3.0");

    public constructor(
        private readonly packageJsonTool: PackageJsonTool.Interface,
        private readonly packageManagerService: PackageManagerService.Interface,
        private readonly context: Context.Interface
    ) {}

    public async canHandle({
        targetVersion,
        currentVersion
    }: UpgradeAbstraction.Params): Promise<boolean> {
        return this.version.between(currentVersion, targetVersion);
    }

    public async execute(): Promise<void> {
        const packageJson = this.packageJsonTool.loadOrThrow();
        packageJson.setDevDependency("typescript", "6.0.3");

        if (this.packageManagerService.name() === "yarn") {
            await this.packageManagerService.update("4.14.1");
        }

        this.packageJsonTool.save(packageJson);
    }
}

export const Upgrade = UpgradeAbstraction.createImplementation({
    implementation: UpgradeImpl,
    dependencies: [PackageJsonTool, PackageManagerService, Context]
});
```

Note: `Context` remains in the dependencies array for consistency, but is no longer used in `execute()`. If you'd like to remove it, remove it from both the constructor and the `dependencies` array.

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test src/upgrades/6.3.0/Upgrade.test.ts`
Expected: All tests pass.

- [ ] **Step 5: Run the full test suite**

Run: `yarn test`
Expected: All tests pass.

- [ ] **Step 6: Verify TypeScript compiles**

Run: `yarn build`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/upgrades/6.3.0/Upgrade.ts src/upgrades/6.3.0/Upgrade.test.ts
git commit -m "feat: simplify 6.3.0 upgrade to use PackageManagerService.update()"
```
