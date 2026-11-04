---
"eslint-plugin-import-x": patch
---

fix: don't crash with `The "path" argument must be of type string` when there is no `package.json` above the linted file. The directory ESLint runs in stands in for the root of the package, and `no-extraneous-dependencies` without `packageDir` lints nothing, as its documentation says
