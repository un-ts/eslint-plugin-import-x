---
"eslint-plugin-import-x": patch
---

fix(core): send a `.js` file to the AST route when es-module-lexer cannot read one of its exports. On the lexer fast path, an export the lexer does not read was dropped from the module's export set as soon as the file had any export it did read, so `hasExport`/`getExportNames` — and `named`, `namespace`, `default`, `no-named-as-default` with them — reported the name as missing. The lexer route now keeps only the declaration heads the lexer reads (`default`, `{`, `*`, `function`, `class`, `const`, `let`, `var`, `enum`, `const enum`, `namespace`, `interface`) and bails for every other one, including `module`, `using`, `await using`, `@dec class`, `abstract class` and `declare …`.
