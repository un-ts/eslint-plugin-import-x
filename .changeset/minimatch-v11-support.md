---
"eslint-plugin-import-x": patch
---

fix: require minimatch v11

minimatch v11 is the only release line with the fix for GHSA-g3hv-75wg-m249.
It removes `makeRe()`, so `no-internal-modules` now matches its `allow` and
`forbid` globs with `Minimatch#match`.
