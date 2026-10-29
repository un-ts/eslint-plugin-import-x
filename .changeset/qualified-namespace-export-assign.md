---
"eslint-plugin-import-x": patch
---

fix(core): `declare namespace foo.bar.baz {}` behind `export = foo` now only adds `bar` to the module's exports. `baz` and the block's members were previously reported as direct exports, so `named` accepted `import { baz }` and `import { deep }`, and a qualified `declare module foo.qux {}` exposed its members too.
