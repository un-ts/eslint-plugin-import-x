---
"eslint-plugin-import-x": patch
---

Fix the `extensions` rule treating an extension alias as a missing extension. An import such as `./foo.js` that the resolver maps to `foo.ts` now keeps its own extension instead of being reported as missing `ts` and autofixed to `./foo.js.ts`. The `pattern` extension inference also recognizes an extension alias, so an extensionless `./foo` that resolves that way is fixed to `./foo.js`. The inference only accepts a candidate that resolves to the same file, and an ambiguous result is reported without a fix. Type-only imports and exports (including inline `type` specifiers) are ignored before the extension branches, so an aliased `.js` specifier is preserved when `checkTypeImports` is off.
