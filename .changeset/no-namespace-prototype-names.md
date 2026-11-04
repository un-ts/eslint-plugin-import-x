---
"eslint-plugin-import-x": patch
---

fix(no-namespace): don't crash or write broken code on members named like `Object.prototype` ones, e.g. `_.toString`
