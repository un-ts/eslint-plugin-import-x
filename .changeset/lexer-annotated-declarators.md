---
"eslint-plugin-import-x": patch
---

fix(core): fall back to the AST route for an annotated binding. es-module-lexer 2.x stops enumerating a declarator list at a type annotation, so `export const a: T = 1, b: U = 2` reported only `a` — `hasExport('b')` was false and every export query on that module was wrong.
