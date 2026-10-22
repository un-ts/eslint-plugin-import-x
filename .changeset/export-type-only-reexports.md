---
"eslint-plugin-import-x": patch
---

fix(export): check types and values separately

`export type * from` only re-exports types, so it no longer conflicts with a value export of the same name, and a type reached through `export *` no longer conflicts with a value. Duplicate types among re-exports are now reported, as are a type-only export and a value export of the same name, and ambient function overloads that clash with another export. String-literal export names such as `"type:Foo"` are no longer mistaken for type exports. Fixes [#414](https://github.com/un-ts/eslint-plugin-import-x/issues/414).
