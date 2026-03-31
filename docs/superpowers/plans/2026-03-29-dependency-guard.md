# DependencyGuard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `DependencyGuard` tool that reads `node_modules/@webiny/cli/files/references.json` and returns a list of version mismatches between that file and the user's `package.json`.

**Architecture:** New Tool following the standard four-file pattern (`abstraction.ts`, `DependencyGuard.ts`, `feature.ts`, `index.ts`) in `src/tool/DependencyGuard/`. Injects `Context` (for `cwd`) and `PackageJsonTool`. Reads `references.json` via `fs/promises`. Returns `Mismatch[]` — callers decide what to do with results.

**Tech Stack:** TypeScript, `node:fs/promises`, `@webiny/di`, vitest

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/tool/DependencyGuard/abstraction.ts` | Create | `Mismatch` type + `IDependencyGuard` interface + `createAbstraction` |
| `src/tool/DependencyGuard/DependencyGuard.ts` | Create | Implementation — reads references.json, compares versions, returns mismatches |
| `src/tool/DependencyGuard/feature.ts` | Create | `DependencyGuardFeature` — registers impl in container |
| `src/tool/DependencyGuard/index.ts` | Create | Re-exports abstraction + feature |
| `src/tool/DependencyGuard/DependencyGuard.test.ts` | Create | Unit tests with mocked `fs/promises`, `Context`, `PackageJsonTool` |
| `src/container.ts` | Modify | Import and register `DependencyGuardFeature` in tools section |
| `AGENTS.md` | Modify | Add `DependencyGuard` to Available Services table + document `Mismatch` type |
| `.claude/skills/write-upgrade/SKILL.md` | Modify | Add `DependencyGuard` to Available Dependencies table + document `Mismatch` type |

---

### Task 1: Create abstraction, feature, and index files

**Files:**
- Create: `src/tool/DependencyGuard/abstraction.ts`
- Create: `src/tool/DependencyGuard/feature.ts`
- Create: `src/tool/DependencyGuard/index.ts`

These three files are pure structure with no logic — no tests needed.

- [ ] **Step 1: Create `abstraction.ts`**

```ts
import { createAbstraction } from "../../utils/createAbstraction.js";

interface IMismatch {
    name: string;
    userVersion: string;
    expectedVersion: string;
}

interface IDependencyGuard {
    verify(): Promise<IMismatch[]>;
}

export const DependencyGuard = createAbstraction<IDependencyGuard>("Tool/DependencyGuard");

export namespace DependencyGuard {
    export type Interface = IDependencyGuard;
    export type Mismatch = IMismatch;
}
```

- [ ] **Step 2: Create `feature.ts`**

```ts
import { createFeature } from "../../utils/createFeature.js";
import { DependencyGuard } from "./DependencyGuard.js";

export const DependencyGuardFeature = createFeature({
    name: "Tool/DependencyGuard",
    register(container) {
        container.register(DependencyGuard);
    }
});
```

- [ ] **Step 3: Create `index.ts`**

```ts
export { DependencyGuard } from "./abstraction.js";
export { DependencyGuardFeature } from "./feature.js";
```

- [ ] **Step 4: Commit**

```bash
git add src/tool/DependencyGuard/abstraction.ts src/tool/DependencyGuard/feature.ts src/tool/DependencyGuard/index.ts
git commit -m "feat: add DependencyGuard abstraction"
```

---

### Task 2: Implement `DependencyGuard` with TDD

**Files:**
- Create: `src/tool/DependencyGuard/DependencyGuard.test.ts`
- Create: `src/tool/DependencyGuard/DependencyGuard.ts`

- [ ] **Step 1: Create the test file**

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { Container } from "@webiny/di";
import { DependencyGuard as DependencyGuardImpl } from "./DependencyGuard.js";
import { DependencyGuard } from "./abstraction.js";
import { Context } from "../../base/Context/index.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";
import { createMockPackageJsonFile } from "../../__tests__/utils/mockPackageJsonFile.js";

vi.mock("node:fs/promises", () => ({
    readFile: vi.fn()
}));

import { readFile } from "node:fs/promises";
const mockReadFile = vi.mocked(readFile);

const makeReferences = (overrides: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    resolutions?: Record<string, string>;
} = {}) => JSON.stringify(overrides);

const createContainer = (options: {
    cwd?: string;
    packageJsonData?: Parameters<typeof createMockPackageJsonFile>[0];
    packageJsonFile?: ReturnType<typeof createMockPackageJsonFile> | null;
    references?: string;
} = {}) => {
    const { cwd = "/project", references = makeReferences() } = options;
    const file =
        options.packageJsonFile !== undefined
            ? options.packageJsonFile
            : createMockPackageJsonFile(options.packageJsonData);

    mockReadFile.mockResolvedValue(references as unknown as Buffer);

    const container = new Container();
    container.registerInstance(Context, { cwd } as Context.Interface);
    container.registerInstance(PackageJsonTool, {
        load: vi.fn().mockReturnValue(file),
        save: vi.fn()
    });
    container.register(DependencyGuardImpl);
    return container;
};

describe("DependencyGuard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("verify", () => {
        it("returns empty array when user has no packages in references", async () => {
            const guard = createContainer({
                packageJsonData: { dependencies: { lodash: "4.17.21" } },
                references: makeReferences({ dependencies: { react: "18.2.0" } })
            }).resolve(DependencyGuard);

            expect(await guard.verify()).toEqual([]);
        });

        it("returns empty array when all matching packages have the same version", async () => {
            const guard = createContainer({
                packageJsonData: { dependencies: { react: "18.2.0" } },
                references: makeReferences({ dependencies: { react: "18.2.0" } })
            }).resolve(DependencyGuard);

            expect(await guard.verify()).toEqual([]);
        });

        it("returns a mismatch when versions differ", async () => {
            const guard = createContainer({
                packageJsonData: { dependencies: { react: "17.0.0" } },
                references: makeReferences({ dependencies: { react: "18.2.0" } })
            }).resolve(DependencyGuard);

            expect(await guard.verify()).toEqual([
                { name: "react", userVersion: "17.0.0", expectedVersion: "18.2.0" }
            ]);
        });

        it("strips range prefixes before comparing — treats ^18.2.0 as matching 18.2.0", async () => {
            const guard = createContainer({
                packageJsonData: { dependencies: { react: "^18.2.0" } },
                references: makeReferences({ dependencies: { react: "18.2.0" } })
            }).resolve(DependencyGuard);

            expect(await guard.verify()).toEqual([]);
        });

        it("strips range prefixes from references version too", async () => {
            const guard = createContainer({
                packageJsonData: { dependencies: { react: "18.2.0" } },
                references: makeReferences({ dependencies: { react: "^18.2.0" } })
            }).resolve(DependencyGuard);

            expect(await guard.verify()).toEqual([]);
        });

        it("checks devDependencies", async () => {
            const guard = createContainer({
                packageJsonData: { devDependencies: { typescript: "4.0.0" } },
                references: makeReferences({ devDependencies: { typescript: "5.0.0" } })
            }).resolve(DependencyGuard);

            expect(await guard.verify()).toEqual([
                { name: "typescript", userVersion: "4.0.0", expectedVersion: "5.0.0" }
            ]);
        });

        it("checks peerDependencies", async () => {
            const guard = createContainer({
                packageJsonData: { peerDependencies: { react: "17.0.0" } },
                references: makeReferences({ peerDependencies: { react: "18.2.0" } })
            }).resolve(DependencyGuard);

            expect(await guard.verify()).toEqual([
                { name: "react", userVersion: "17.0.0", expectedVersion: "18.2.0" }
            ]);
        });

        it("checks resolutions", async () => {
            const guard = createContainer({
                packageJsonData: { resolutions: { lodash: "4.17.20" } },
                references: makeReferences({ resolutions: { lodash: "4.17.21" } })
            }).resolve(DependencyGuard);

            expect(await guard.verify()).toEqual([
                { name: "lodash", userVersion: "4.17.20", expectedVersion: "4.17.21" }
            ]);
        });

        it("collects mismatches across multiple sections", async () => {
            const guard = createContainer({
                packageJsonData: {
                    dependencies: { react: "17.0.0" },
                    devDependencies: { typescript: "4.0.0" }
                },
                references: makeReferences({
                    dependencies: { react: "18.2.0" },
                    devDependencies: { typescript: "5.0.0" }
                })
            }).resolve(DependencyGuard);

            const result = await guard.verify();
            expect(result).toHaveLength(2);
            expect(result).toContainEqual({ name: "react", userVersion: "17.0.0", expectedVersion: "18.2.0" });
            expect(result).toContainEqual({ name: "typescript", userVersion: "4.0.0", expectedVersion: "5.0.0" });
        });

        it("ignores packages missing from references entirely", async () => {
            const guard = createContainer({
                packageJsonData: { dependencies: { lodash: "4.17.21", react: "17.0.0" } },
                references: makeReferences({ dependencies: { react: "18.2.0" } })
            }).resolve(DependencyGuard);

            const result = await guard.verify();
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe("react");
        });

        it("handles missing sections in references gracefully", async () => {
            const guard = createContainer({
                packageJsonData: { dependencies: { react: "18.2.0" } },
                references: makeReferences()  // no sections at all
            }).resolve(DependencyGuard);

            expect(await guard.verify()).toEqual([]);
        });

        it("throws when package.json cannot be loaded", async () => {
            const guard = createContainer({ packageJsonFile: null }).resolve(DependencyGuard);
            await expect(guard.verify()).rejects.toThrow("Failed to load package.json");
        });

        it("throws when references.json cannot be read", async () => {
            mockReadFile.mockRejectedValue(new Error("ENOENT"));
            const guard = createContainer().resolve(DependencyGuard);
            await expect(guard.verify()).rejects.toThrow("Failed to load references.json from");
        });
    });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
yarn vitest run src/tool/DependencyGuard/DependencyGuard.test.ts
```

Expected: all tests fail — `DependencyGuard.ts` does not exist yet.

- [ ] **Step 3: Create `DependencyGuard.ts`**

```ts
import path from "node:path";
import { readFile } from "node:fs/promises";
import { DependencyGuard as DependencyGuardAbstraction } from "./abstraction.js";
import { Context } from "../../base/Context/index.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";

interface ReferencesFile {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    resolutions?: Record<string, string>;
}

type Section = keyof ReferencesFile;

const SECTIONS: Section[] = ["dependencies", "devDependencies", "peerDependencies", "resolutions"];

const stripRange = (version: string): string => version.replace(/^[\^~>=<v\s]+/, "");

class DependencyGuardImpl implements DependencyGuardAbstraction.Interface {
    public constructor(
        private readonly context: Context.Interface,
        private readonly packageJsonTool: PackageJsonTool.Interface
    ) {}

    public async verify(): Promise<DependencyGuardAbstraction.Mismatch[]> {
        const referencesPath = path.join(
            this.context.cwd,
            "node_modules",
            "@webiny",
            "cli",
            "files",
            "references.json"
        );

        let references: ReferencesFile;
        try {
            const content = await readFile(referencesPath, "utf-8");
            references = JSON.parse(content) as ReferencesFile;
        } catch {
            throw new Error(`Failed to load references.json from ${referencesPath}`);
        }

        const packageJson = this.packageJsonTool.load();
        if (!packageJson) {
            throw new Error("Failed to load package.json");
        }

        const mismatches: DependencyGuardAbstraction.Mismatch[] = [];

        const getUserSection = (section: Section): Record<string, string> => {
            switch (section) {
                case "dependencies":
                    return packageJson.getDependencies();
                case "devDependencies":
                    return packageJson.getDevDependencies();
                case "peerDependencies":
                    return packageJson.getPeerDependencies();
                case "resolutions":
                    return packageJson.getResolutions();
            }
        };

        for (const section of SECTIONS) {
            const userDeps = getUserSection(section);
            const refDeps = references[section] ?? {};

            for (const [name, userVersion] of Object.entries(userDeps)) {
                if (!(name in refDeps)) {
                    continue;
                }
                const strippedUser = stripRange(userVersion);
                const strippedExpected = stripRange(refDeps[name]);
                if (strippedUser !== strippedExpected) {
                    mismatches.push({ name, userVersion: strippedUser, expectedVersion: strippedExpected });
                }
            }
        }

        return mismatches;
    }
}

export const DependencyGuard = DependencyGuardAbstraction.createImplementation({
    implementation: DependencyGuardImpl,
    dependencies: [Context, PackageJsonTool]
});
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
yarn vitest run src/tool/DependencyGuard/DependencyGuard.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
yarn vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/tool/DependencyGuard/DependencyGuard.ts src/tool/DependencyGuard/DependencyGuard.test.ts
git commit -m "feat: implement DependencyGuard tool"
```

---

### Task 3: Register `DependencyGuard` in the container

**Files:**
- Modify: `src/container.ts`

- [ ] **Step 1: Add import to `src/container.ts`**

After the existing tool imports, add:

```ts
import { DependencyGuardFeature } from "./tool/DependencyGuard/index.js";
```

- [ ] **Step 2: Register in tools section of `createContainer`**

After `PackageJsonToolFeature.register(container);`, add:

```ts
DependencyGuardFeature.register(container);
```

- [ ] **Step 3: Run full test suite**

```bash
yarn vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Run build**

```bash
yarn build
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/container.ts
git commit -m "feat: register DependencyGuard in container"
```

---

### Task 4: Update documentation

**Files:**
- Modify: `AGENTS.md`
- Modify: `.claude/skills/write-upgrade/SKILL.md`

- [ ] **Step 1: Add `DependencyGuard` to the Available Services table in `AGENTS.md`**

After the `PackageJsonTool` row, add:

```markdown
| `DependencyGuard` | `tool/DependencyGuard/index.js` | `verify(): Promise<Mismatch[]>` — reads `node_modules/@webiny/cli/files/references.json`, compares against user's `package.json` (all four sections), strips ranges, returns `Mismatch[]` where each entry is `{ name, userVersion, expectedVersion }` (empty array = no mismatches). |
```

- [ ] **Step 2: Add `DependencyGuard` to the Available Dependencies table in `.claude/skills/write-upgrade/SKILL.md`**

After the `PackageJsonService` row, add:

```markdown
| `DependencyGuard` | `../../tool/DependencyGuard/index.js` | `verify(): Promise<Mismatch[]>` — reads `node_modules/@webiny/cli/files/references.json`, compares against user's `package.json` (all four sections), strips ranges, returns `Mismatch[]` where each entry is `{ name, userVersion, expectedVersion }` (empty array = no mismatches). |
```

- [ ] **Step 3: Run post-task sequence**

```bash
yarn prettier:fix && yarn eslint:fix && yarn && yarn build
```

Expected: clean output, no errors.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md .claude/skills/write-upgrade/SKILL.md
git commit -m "docs: document DependencyGuard in AGENTS.md and write-upgrade skill"
```
