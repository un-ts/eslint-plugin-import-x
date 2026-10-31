---
"eslint-plugin-import-x": patch
---

Fix `no-extraneous-dependencies` telling you to add a package that is already in `devDependencies` or `optionalDependencies` when its import resolves through `@types/*`
