---
"eslint-plugin-import-x": patch
---

fix(no-empty-named-blocks): use the reported import's tokens in the side-effect suggestion

The suggestion looked up `import` and `from` in the whole file, so with any earlier import it used that import's tokens and left the code unchanged.
