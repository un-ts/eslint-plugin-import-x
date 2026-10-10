---
"eslint-plugin-import-x": patch
---

fix(no-unused-modules): `missingExports` no longer reports "No exports found" for a file whose only exports are `export * from` declarations, and `unusedExports` now checks `export * as ns from` as the export `ns` and counts its source module as namespace imported
