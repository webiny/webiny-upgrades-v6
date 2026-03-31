---
name: Post-task commands
description: Commands to always run after completing any task in this project
type: feedback
---

After every task, always run these commands in order:
1. `yarn prettier:fix`
2. `yarn eslint:fix`
3. `yarn`
4. `yarn build`
5. `yarn test`

**Why:** User expects code to be formatted, linted, dependencies installed, type-checked, and tests passing before considering any task done.

**How to apply:** Run all five after every change, no matter how small, before committing or reporting completion. If any step fails and you fix the issue, restart the entire sequence from step 1 (`yarn prettier:fix`) again.
