---
"eslint-plugin-import-x": patch
---

fix(namespace): report members exported only as types

A name exported only as a type (`export type Foo`, `export interface Foo`, `export type { Foo }`, `export type * from`) is erased at runtime, so accessing it as a member of an imported namespace (`ns.Foo`, `const { Foo } = ns`, `<ns.Foo />`) is now reported. Classes, enums and names that are both a type and a value are still accepted, and unresolvable names still fail open. Fixes [#540](https://github.com/un-ts/eslint-plugin-import-x/issues/540).
