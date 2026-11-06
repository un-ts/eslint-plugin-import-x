---
"eslint-plugin-import-x": patch
---

fix: keep trailing comments and line-scoped directives with their targets. `first` inserts moved imports right after the directive/statement, before any trailing comment, and withholds the autofix for the whole group when a moved import has comments. `newline-after-import` inserts the blank before a single-line trailing comment (or after a multi-line one), so third-party directives such as `prettier-ignore` keep their target. Both rules share the `getTrailingComments` util.
