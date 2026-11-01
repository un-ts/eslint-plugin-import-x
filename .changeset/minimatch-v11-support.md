---
"eslint-plugin-import-x": patch
---

fix: support minimatch v11

minimatch v11 is the only release line with the fix for GHSA-g3hv-75wg-m249,
and it removes `makeRe()`, which `no-internal-modules` imported at module
load, so the whole plugin failed to load against it. The rule now matches its
`allow` and `forbid` globs with `Minimatch#match`, which v9, v10 and v11 all
provide, and the dependency range admits `^11.0.1`. A pattern `makeRe()`
rejected (a comment, or empty) never matches through `Minimatch#match` either,
so the rule's behavior is unchanged.
