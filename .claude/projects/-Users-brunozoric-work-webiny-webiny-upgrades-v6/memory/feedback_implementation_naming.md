---
name: Implementation class naming convention
description: How to name and structure implementation classes and their exports
type: feedback
---

Always define the implementation class separately above the `createImplementation` call. Never use an inline anonymous class.

```ts
// correct
import { Upgrade as UpgradeAbstraction } from "./abstraction.js";

class UpgradeImpl implements UpgradeAbstraction.Interface {
    // ...
}

export const Upgrade = UpgradeAbstraction.createImplementation({
    implementation: UpgradeImpl,
    dependencies: [...]
});
```

**Why:** User noticed inline `implementation: class implements ...` patterns and explicitly called them out as wrong.

**How to apply:** Class name = `<Name>Impl`, abstraction import alias = `<Name>Abstraction`, exported const = `<Name>`. Always in this order: import, class, export.
