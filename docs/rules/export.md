# import-x/export

💼 This rule is enabled in the following configs: ❗ `errors`, ❗ `flat/errors`, ☑️ `flat/recommended`, ☑️ `recommended`.

<!-- end auto-generated rule header -->

Reports funny business with exports, like repeated exports of names or defaults.

## Rule Details

```js
export default class MyClass { /*...*/ } // Multiple default exports.

function makeClass() { return new MyClass(...arguments) }

export default makeClass // Multiple default exports.
```

or

```js
export const foo = function () {
  /*...*/
} // Multiple exports of name 'foo'.

function bar() {
  /*...*/
}
export { bar as foo } // Multiple exports of name 'foo'.
```

In the case of named/default re-export, all `n` re-exports will be reported,
as at least `n-1` of them are clearly mistakes, but it is not clear which one
(if any) is intended. Could be the result of copy/paste, code duplication with
intent to rename, etc.

### TypeScript

A type and a value may share a name, so types and values are checked
separately.

`export type * from` only re-exports types. Given a module `foo.ts` that
exports a value named `foo`, these do not conflict:

```ts
export type * from './foo'
export { foo } from './foo'
```

A type-only export such as `export type { Foo }` still conflicts with a value
exported by name as `Foo`, such as `export const Foo` or
`export { Foo } from './foo'`.

## Further Reading

- Lee Byron's [ES7] export proposal

[ES7]: https://github.com/leebyron/ecmascript-more-export-from
