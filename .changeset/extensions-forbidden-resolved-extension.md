---
"eslint-plugin-import-x": patch
---

fix(extensions): stop requiring a `js` alias on extensionless imports that resolve to a file whose extension is `never`, such as `.ts` with `{ js: 'always', ts: 'never' }`.
