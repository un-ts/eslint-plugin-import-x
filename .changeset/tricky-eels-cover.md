---
"eslint-plugin-import-x": major
---

Rewrite the module analysis core for performance boosts. The speedup depends on your project, and we expect no performance regression in any setup — if you measure one, please report it.

Rules like `named`, `default`, `namespace`, `no-cycle`, `no-deprecated`, and many more, need to know what the modules you import actually export. Until now, answering that meant running the full ESLint parser over every one of those files — including everything you pull in from `node_modules`.

That core has been rewritten:

- Plain JavaScript is now read with [`es-module-lexer`](https://github.com/guybedford/es-module-lexer) instead of being parsed. Anything it can't read faithfully — TypeScript, JSX, Flow — still goes through the ESLint parser exactly as before.
- Analysis is lazy. Many work now happens when a rule actually asks for it, so enabling one rule no longer pays for what the others would have needed.
- Results are cached and shared between rules.

**There are no breaking changes: no configuration changes are needed, and no behavior changes are intended.** Every rule should report exactly what it reported before. The full test suite passes, but there could be some edge cases. If a rule starts reporting something it didn't before, or stops reporting something it should, please open an issue with a minimum reproduction — bug reports on this are very welcome.
