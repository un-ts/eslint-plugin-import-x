---
"eslint-plugin-import-x": patch
---

Fix regression in rule `no-unused-modules` which would incorrectly initialize option `src` to `[]` instead of `[process.cwd()]`, breaking file discovery.
