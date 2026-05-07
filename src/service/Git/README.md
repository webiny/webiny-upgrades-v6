# Git

A service that wraps Git operations used by the upgrade framework to inspect and reset the state of the target project's working tree. It is registered as a DI-managed service so upgrade scripts can check whether uncommitted changes exist before proceeding and roll back all modifications if an upgrade step fails.

## API

| Export | Kind | Description |
|---|---|---|
| `Git` | abstraction / DI token | DI token and namespace for the `Git.Interface` type; resolved to the concrete implementation at runtime. |
| `Git.Interface` | type | Contract that the service implements: `isClean()` and `restore()`. |
| `GitFeature` | feature | DI feature that registers `GitService` against the `Git` token; pass to a container to activate the service. |

### `Git.Interface` methods

| Method | Signature | Description |
|---|---|---|
| `isClean` | `() => Promise<boolean>` | Returns `true` when the working tree has no uncommitted changes, or when the directory is not a Git repository. |
| `restore` | `() => Promise<void>` | Runs `git restore .` then `git clean -fd` to discard all tracked and untracked changes; no-ops outside a Git repository. |

## Usage

```ts
import { GitFeature, Git } from "./service/Git/index.js";

// Register the feature when building your container
container.use(GitFeature);

const git = container.resolve(Git);

if (!(await git.isClean())) {
    console.error("Working tree is dirty — aborting upgrade.");
    process.exit(1);
}

// On failure, roll back all changes:
await git.restore();
```
