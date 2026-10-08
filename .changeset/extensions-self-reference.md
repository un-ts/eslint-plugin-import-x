---
"eslint-plugin-import-x": minor
---

Add a `checkSelfReference` option to the `extensions` rule. When set, a package's import of its own subpath export (e.g. `pkg/sub` from inside `pkg`) is treated as a package import, so `ignorePackages` applies to it.
