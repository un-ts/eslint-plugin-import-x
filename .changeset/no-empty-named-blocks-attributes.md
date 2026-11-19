---
"eslint-plugin-import-x": patch
---

fix(no-empty-named-blocks): ignore the import attributes block, so `import Default from 'mod' with {}` is no longer reported and broken by the fix, and `import 'mod' with {}` no longer crashes the rule
