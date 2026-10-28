---
"eslint-plugin-import-x": patch
---

fix(no-duplicates): without `prefer-inline`, the autofix moves inline `type` specifiers into the `import type { ... }` of the same module and leaves the value specifiers in their own import, instead of merging both into one import that is invalid or changes which specifiers are type-only.
