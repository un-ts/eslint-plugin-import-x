---
"eslint-plugin-import-x": patch
---

fix(no-duplicates): keep type-only specifiers type-only when the autofix merges `import type { ... }` with an import that has inline `type` specifiers.
