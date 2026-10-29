---
"eslint-plugin-import-x": patch
---

fix(no-extraneous-dependencies): report the runtime package instead of its `@types/*` package when an import resolves to type definitions, matching `eslint-plugin-import`. A `@types/*` package in `dependencies` no longer counts as a declaration of its runtime package, and `whitelist` accepts either name. A type-only import checked with `includeTypes` still needs only the `@types/*` package.
