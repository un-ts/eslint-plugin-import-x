---
"eslint-plugin-import-x": minor
---

`extensions`: when an import has no extension and cannot be resolved as-is, try the extensions configured as `always` in `pattern` and use the unique one that resolves for the fix or suggestion. When no extension can be determined automatically, explain that in the `missing` message instead of only reporting a bare missing extension.
