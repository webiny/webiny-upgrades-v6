# Application

The top-level entry point that ties together all upgrade services and drives a single upgrade run. It checks whether the target version is already installed, delegates to `UpgradeRunner`, runs a post-upgrade `DependencyGuard` check to surface any version drift, and hands off the final outcome to `Responder` (exiting with 0 on success or 1 on failure).

## API

| Export | Kind | Description |
|---|---|---|
| `Application` | abstraction token | DI token for the application; resolved to call `execute()`. |
| `Application.Interface` | type | `{ execute(): Promise<void> }` |
| `ApplicationFeature` | feature | Registers the `ApplicationImpl` against the `Application` token. |

## Usage

```ts
import { Application, ApplicationFeature } from "./base/Application/index.js";

// Register when bootstrapping — all dependencies must also be registered
container.use(ApplicationFeature);

const app = container.resolve(Application);
await app.execute(); // never returns; exits via Responder
```
