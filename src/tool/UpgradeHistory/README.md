# UpgradeHistory

Tracks which Webiny versions have been applied to a project by persisting a timestamped history array inside the `webiny` field of the project's `package.json`. Upgrade scripts use this tool to record a completed upgrade, check whether a version was already applied, and query the full upgrade timeline — enabling idempotent, auditable upgrade runs.

## API

| Export                     | Kind              | Description                                                                     |
| -------------------------- | ----------------- | ------------------------------------------------------------------------------- |
| `UpgradeHistory`           | abstraction token | DI token and namespace for the `IUpgradeHistory` service.                       |
| `UpgradeHistory.Interface` | type              | Contract that the implementation must satisfy (`add`, `remove`, `get`, `list`). |
| `UpgradeHistory.Entry`     | type              | Shape of a single history record: `{ version: string; timestamp: string }`.     |
| `UpgradeHistoryFeature`    | feature           | Registers the `UpgradeHistory` implementation into a DI container.              |

## Usage

```ts
import { UpgradeHistory, UpgradeHistoryFeature } from "./tool/UpgradeHistory/index.js";
import { Version } from "../../base/Version/index.js";

container.use(UpgradeHistoryFeature);

const history = container.resolve(UpgradeHistory);

// Record that a version was applied
history.add(Version.create("6.1.0"));

// Check whether a version was already applied
const entry = history.get(Version.create("6.1.0"));
// => { version: "6.1.0", timestamp: "2026-03-31T10:00:00.000Z" } | null

// List all applied versions
const all = history.list();

// Remove a version record (e.g. during rollback)
history.remove(Version.create("6.1.0"));
```
