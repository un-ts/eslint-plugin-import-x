---
"eslint-plugin-import-x": patch
---

fix(core): send a `.js` file to the AST route when es-module-lexer cannot read one of its exports. On the lexer fast path, an export the lexer does not read was dropped from the module's export set as soon as the file had any export it did read, so `hasExport`/`getExportNames` — and `named`, `namespace`, `default`, `no-named-as-default` with them — reported the name as missing. The lexer route now keeps only the declaration heads whose exported names are read faithfully by es-module-lexer v3 (`default`, `{`, `*`, `function`, `class`, `const`, `let`, `var`) and bails on every unrecognised head as a conservative fallback, including `module`, `using`, `await using`, `@dec class`, `abstract class`, `declare`, `enum`, `const enum`, `namespace`, and `interface` (v3 reads those, but they are not yet in the whitelist).
