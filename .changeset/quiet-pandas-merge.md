---
"eslint-plugin-import-x": patch
---

Merge dependencies from the closest `package.json` in addition to `packageDir` in `no-extraneous-dependencies`, so workspace packages see the dependencies declared in their own manifest; `bundledDependencies` from every merged manifest are unioned instead of overwritten.
