---
"eslint-plugin-import-x": patch
---

fix: support minimatch v9/v10/v11 and drop makeRe

minimatch v11 is the only release line with the fix for GHSA-g3hv-75wg-m249.
It removes `makeRe()`, so `no-internal-modules` now matches its `allow` and
`forbid` globs with `Minimatch#match`.
