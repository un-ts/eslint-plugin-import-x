---
"eslint-plugin-import-x": minor
---

feat(no-unused-modules): list files without `FileEnumerator`, so the rule works with flat config without an eslintrc and on ESLint 10. Note: on ESLint 10 the rule was a no-op before and now reports, and `suppressMissingFileEnumeratorAPIWarning` is deprecated and has no effect
