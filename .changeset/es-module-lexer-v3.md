---
"eslint-plugin-import-x": patch
---

chore(deps): upgrade `es-module-lexer` from v2 to v3. The v3 API is a complete redesign using discriminated union types (`StaticImport | DynamicImport | ImportMetaRef` for imports, `DirectExport | Reexport | ReexportAll` for exports) replacing numeric `d` fields and short property names. The lexer route now resolves `export { x }` where `x` comes from a non-namespace import as a reexport rather than an own export, which is more semantically accurate.
