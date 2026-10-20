---
"eslint-plugin-import-x": patch
---

fix(no-cycle): report cycles through side-effect imports such as `import './foo'` and `import {} from './foo'`. They have no specifiers, so they were skipped as if they were type-only imports. The unambiguous-module prefilter also recognizes them now, so a file whose only module syntax is a side-effect import is analyzed on the AST route too, as it already was on the lexer route
