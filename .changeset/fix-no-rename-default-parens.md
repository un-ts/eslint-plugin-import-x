---
"eslint-plugin-import-x": patch
---

fix(no-rename-default): derive the default export name from a parenthesized assignment, e.g. `export default (Foo = function () {})`, which is how prettier v3.9 formats such defaults
