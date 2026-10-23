---
"eslint-plugin-import-x": patch
---

fix(order): compare statement indexes as numbers, so the autofix no longer moves an import across a non-import statement when the indexes sort differently as strings, such as 2 and 10.
