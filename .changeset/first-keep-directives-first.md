---
"eslint-plugin-import-x": patch
---

fix(first): keep directives such as `'use client'` above the imports the fixer moves up, keep a next-line directive above the statement it covers, and withhold the fix when a moved import has a leading next-line suppression
