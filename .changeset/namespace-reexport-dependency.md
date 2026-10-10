---
"eslint-plugin-import-x": patch
---

fix: count `export * as ns from '…'` as a runtime dependency in the module analysis core

`export * as ns from 'x'` loads `x` at runtime, but both `ModuleInfo` construction paths omitted the edge, so graph traversal — and `avoid-importing-barrel-files` in particular — could undercount the modules an import pulls in. The namespace export metadata is unchanged, and `export type * as ns from` stays type-only. Fixes [#525](https://github.com/un-ts/eslint-plugin-import-x/issues/525).
