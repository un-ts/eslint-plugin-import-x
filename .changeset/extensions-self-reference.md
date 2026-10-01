---
"eslint-plugin-import-x": patch
---

fix(extensions): treat a package's import of its own subpath export (e.g. `pkg/sub` from inside `pkg`) as a package import, so `ignorePackages` applies to it.
