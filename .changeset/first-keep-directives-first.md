---
"eslint-plugin-import-x": patch
---

fix(first): keep directives such as `'use client'` above the imports the fixer moves up, keep a next-line directive above the statement it covers, and withhold the autofix for the whole group when a moved import has comments. The shared line-scoped directive check also recognizes the decorated `/** @ts-ignore */` and `/// @ts-ignore` forms.
