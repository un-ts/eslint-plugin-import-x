---
"eslint-plugin-import-x": patch
---

perf(avoid-importing-barrel-files): skip the surface parse for a dependency that cannot be a barrel

The rule sizes the runtime module graph behind every imported target, and a
target only becomes a candidate once its export count passes
`amountOfExportsToConsiderModuleAsBarrel`. A lexer-analyzed module already
reports its export entries, so a count at or below the threshold settles the
question without producing the exact export/declaration surface — one parse
saved per small plain-JS dependency.

Anything es-module-lexer does not read faithfully still goes through the parser,
and a module with a default export is never ruled out: the properties of
`export default { … }` are exports no entry count can see.
