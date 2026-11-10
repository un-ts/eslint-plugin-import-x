---
"eslint-plugin-import-x": patch
---

fix(default): do not report default imports of files that only use dynamic `import()` and may be CommonJS, keep reporting `.mjs`, `.mts` and `type: module` files
