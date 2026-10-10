---
"eslint-plugin-import-x": minor
---

Add four barrel file detection rules ported from `eslint-plugin-barrel-files`: `avoid-barrel-files`, `avoid-importing-barrel-files`, `avoid-namespace-import` and `avoid-re-export-all`.

`avoid-importing-barrel-files` checks every runtime way a module can be referenced — static imports, re-exports (`export … from`, `export * from`, `export * as ns from`), dynamic `import()` and CommonJS `require()` — with type-only statements exempt.
