---
"eslint-plugin-import-x": patch
---

Make the `no-unused-modules` rule no-op on ESLint 10 or later for now before we can implement an alternative. A warning message about this behavior is added, and can be suppressed with the new `suppressMissingFileEnumeratorAPIWarning` rule option (`import-x/no-unused-modules: ['error', { suppressMissingFileEnumeratorAPIWarning: true }']`).
