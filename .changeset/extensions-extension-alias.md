---
"eslint-plugin-import-x": patch
---

Fix the `extensions` rule treating an extension alias as a missing extension. An import such as `./foo.js` that the resolver maps to `foo.ts` now keeps its own extension instead of being reported as missing `ts` and autofixed to `./foo.js.ts`.
