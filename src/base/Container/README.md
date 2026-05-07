# Container

A thin DI token that makes the `@webiny/di` container instance itself injectable. Registering `ContainerFeature` binds the live container instance to the `Container` token so that services which need to perform dynamic resolution at runtime can declare it as a dependency rather than reaching for a global.

## API

| Export | Kind | Description |
|---|---|---|
| `Container` | abstraction token | DI token resolving to the active `@webiny/di` container instance. |
| `Container.Interface` | type | Alias for the `DIContainer` type from `@webiny/di`. |
| `ContainerFeature` | feature | Registers the container instance against the `Container` token via `registerInstance`. |

## Usage

```ts
import { ContainerFeature, Container } from "./base/Container/index.js";

// Register during bootstrap (typically the very first feature registered)
container.use(ContainerFeature);

// Resolve the container itself from a service constructor
class MyService {
    constructor(private readonly container: Container.Interface) {}
}
```
