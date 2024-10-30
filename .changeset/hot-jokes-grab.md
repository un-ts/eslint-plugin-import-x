---
"eslint-plugin-import-x": patch
---

Add extra guard for rule `no-named-as-default`. A few guards are borrowed from https://github.com/import-js/eslint-plugin-import/pull/3032, but we don't sync the rest of changes from upstream since we have already implemented a way more performant check.
