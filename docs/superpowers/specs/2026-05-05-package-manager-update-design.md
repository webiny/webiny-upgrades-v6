# PackageManagerService.update(version) Design

## Summary

Add `update(version: string): Promise<void>` to the `PackageManager` and `PackageManagerService` interfaces so each package manager implementation knows how to update itself to a target version. Replace the manual yarn binary copy logic in the 6.3.0 upgrade with a call to this method.

## Interface Changes

`abstraction.ts` — add to both `IPackageManager` and `IPackageManagerService`:

```ts
update(version: string): Promise<void>;
```

Add `UpdateResponse = Promise<void>` type alias to both the `PackageManager` and `PackageManagerService` namespaces.

## Implementations

### YarnPackageManager

```ts
public async update(version: string): Promise<void> {
    try {
        await execa("yarn", ["set", "version", version], { stdio: "inherit" });
    } catch (ex: any) {
        this.logger.error(ex.message);
        throw ex;
    }
}
```

### NpmPackageManager

```ts
public async update(version: string): Promise<void> {
    try {
        await execa("npm", ["install", "-g", `npm@${version}`], { stdio: "inherit" });
    } catch (ex: any) {
        this.logger.error(ex.message);
        throw ex;
    }
}
```

### PnpmPackageManager

```ts
public async update(version: string): Promise<void> {
    throw new Error("Updating pnpm via PackageManagerService is not supported yet.");
}
```

### PackageManagerServiceImpl

Delegates to the underlying package manager, wrapped in a timer with a log prefix — same pattern as `install()`:

```ts
public async update(version: string): PackageManagerServiceAbstraction.UpdateResponse {
    this.logger.info("Updating package manager...");
    await this.timer.execute("PackageManagerService.update", async () => {
        return await this.packageManager.update(version);
    });
}
```

## 6.3.0 Upgrade Changes

Remove the three private methods `getYarnBinaryInfo`, `copyYarnBinary`, and `updateYarnrc`. Replace the yarn block in `execute()` with:

```ts
if (this.packageManagerService.name() === "yarn") {
    await this.packageManagerService.update("4.14.1");
}
```

The version string `"4.14.1"` is hard-coded by the upgrade author and adjusted to match the target yarn version for that release.

## Files to Change

| File | Change |
|------|--------|
| `src/service/PackageManager/abstraction.ts` | Add `update()` to `IPackageManager` and `IPackageManagerService`; add `UpdateResponse` type alias |
| `src/service/PackageManager/YarnPackageManager.ts` | Add `update()` implementation |
| `src/service/PackageManager/NpmPackageManager.ts` | Add `update()` implementation |
| `src/service/PackageManager/PnpmPackageManager.ts` | Add `update()` that throws |
| `src/service/PackageManager/PackageManagerService.ts` | Add `update()` delegation with timer + logger |
| `src/upgrades/6.3.0/Upgrade.ts` | Remove 3 private methods, replace yarn block with `update()` call |
