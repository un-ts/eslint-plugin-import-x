---
"eslint-plugin-import-x": patch
---

fix: change default `conditions`

`default` should be last matched, `module` should not be here.

Reference https://github.com/isaacs/resolve-import/blob/03daf0a9649d183bea40975a7777ae72955f44b8/src/resolve-conditional-value.ts#L15
