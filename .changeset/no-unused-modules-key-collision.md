---
"eslint-plugin-import-x": patch
---

fix(no-unused-modules): exports named `ImportDefaultSpecifier`, `ImportNamespaceSpecifier` or `ExportAllDeclaration` no longer collide with the rule's internal bookkeeping keys, and `import { default as x }` now counts as a use of the default export
