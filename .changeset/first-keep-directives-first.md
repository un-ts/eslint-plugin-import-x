---
"eslint-plugin-import-x": patch
---

fix(first): keep directives such as `'use client'` above the imports the fixer moves up, and withhold the autofix for the whole group when a moved import has comments. The moved imports are inserted right after the directive, before any trailing comment, so any line-scoped directive (including third-party ones such as `prettier-ignore`) keeps its target.
