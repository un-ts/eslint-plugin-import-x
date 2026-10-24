---
"eslint-plugin-import-x": patch
---

fix(no-extraneous-dependencies): report the runtime package instead of its `@types/*` package when an import resolves to type definitions, matching `eslint-plugin-import`.
