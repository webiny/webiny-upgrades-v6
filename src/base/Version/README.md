# Version

An immutable semver wrapper used throughout the upgrade framework wherever version comparisons are needed. Pre-release and build metadata are stripped before comparisons so that suffixes like `-beta.0` or `-local-npm.11` do not affect ordering. Construction is strict — use `create` for trusted strings and `parse` at system boundaries.

## API

| Export | Kind | Description |
|---|---|---|
| `Version` | class | Immutable semver value object. |
| `InvalidSemverError` | error class | Thrown by `Version.create` when the input string is not valid semver. |

### `Version` static methods

| Method | Description |
|---|---|
| `Version.create(v)` | Parses `v` and throws `InvalidSemverError` if invalid. Use for hardcoded or trusted strings. |
| `Version.parse(v)` | Parses `v` and returns `null` if invalid. Use at system boundaries (user input, registry, files). |

### `Version` instance members

| Member | Description |
|---|---|
| `raw` | The original string passed to the constructor. |
| `gt(other)` | Greater-than comparison (pre-release stripped). |
| `gte(other)` | Greater-than-or-equal comparison. |
| `lt(other)` | Less-than comparison. |
| `lte(other)` | Less-than-or-equal comparison. |
| `equal(other)` | Equality comparison. |
| `between(lower, upper)` | `true` when `lower < this <= upper`; lower uses raw semver so pre-release sorts below release. |
| `compareTo(other)` | Returns -1 / 0 / 1; suitable for `Array.sort`. |
| `format()` | Returns the `major.minor.patch` string. |
| `toSemVer()` | Returns the underlying `SemVer` object. |

## Usage

```ts
import { Version } from "./base/Version/index.js";

const v = Version.create("6.1.0");
const userInput = Version.parse(rawString); // null if invalid

v.gt(Version.create("6.0.0"));   // true
v.between(Version.create("6.0.0"), Version.create("6.2.0")); // true
```
