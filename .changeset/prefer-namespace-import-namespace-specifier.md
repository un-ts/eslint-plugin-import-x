---
"eslint-plugin-import-x": patch
---

fix(prefer-namespace-import): keep a namespace specifier when splitting the default import

The autofix looked for `{` and `}` to find the other specifiers, so
`import Foo, * as Bar from 'foo'` was rewritten into code that does not parse.
It now takes the text between the comma after the default specifier and `from`,
which also covers `* as Bar`.
