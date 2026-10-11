---
"eslint-plugin-import-x": patch
---

fix(module-visitor): treat `import x = require('y')` as a module reference, so every rule built on `moduleVisitor` (`no-unresolved`, `no-cycle`, `extensions`, `no-extraneous-dependencies`, `no-restricted-paths`, `no-absolute-path`, …) sees the specifier. `export import x = require('y')` was missed too, because its `ExportNamedDeclaration` has a `null` source
