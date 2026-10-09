---
"eslint-plugin-import-x": patch
---

fix(no-duplicates): the autofix no longer drops `x` when merging `import { x }` into an import of `x as y`, and `prefer-inline` no longer turns the `from` keyword or an alias into `type ...` when the first import is `import type { ... }`
