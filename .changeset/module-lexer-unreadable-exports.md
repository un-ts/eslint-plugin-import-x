---
"eslint-plugin-import-x": patch
---

fix(core): send a `.js` file to the AST route when es-module-lexer cannot read one of its exports. On the lexer fast path, an export the lexer does not read was dropped from the module's export set as soon as the file had any export it did read, so `hasExport`/`getExportNames` — and `named`, `namespace`, `default`, `no-named-as-default` with them — reported the name as missing. The lexer route now keeps only the declaration heads the lexer reads (`default`, `{`, `*`, `function`, `class`, `const`, `let`, `var`) and bails for every other one, including `enum`, `const enum`, `namespace`, `module`, `interface`, `using`, `await using`, `@dec class`, `abstract class` and `declare …`. It also bails on a TypeScript/Flow annotation on an exported binding (`export const a: number = 1, b = 2`), where the lexer stops enumerating the declarator list at the `:` and loses every name after it
