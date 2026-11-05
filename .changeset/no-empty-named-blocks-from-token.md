---
"eslint-plugin-import-x": patch
---

fix(no-empty-named-blocks): use the reported import's tokens in the side-effect suggestion

The suggestion looked up `import` and `from` in the whole file, so an earlier import with a `from` clause, like `import a from 'a'`, supplied the tokens and the suggestion left the code unchanged. Earlier side-effect imports have no `from` and weren't affected.
