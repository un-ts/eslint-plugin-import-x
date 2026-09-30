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

String-literal export names are compared in full. For example, `"type:Foo"`
and `Foo` are distinct names.

### TypeScript

Type-only wildcard exports are checked separately from value exports. Given
a module `foo.ts` that exports a value named `foo`, these re-exports do not
conflict:

```ts
export type * from './foo.ts'
export { foo } from './foo.ts'
```

Value-only members are not included in type-only wildcard duplicate checks.
They also do not conflict with a local type declaration of the same name.
Type declarations and the type side of classes, enums, and namespaces are
tracked through named re-exports and wildcard barrels.

Both `export type { Foo }` and `export { type Foo }` are also checked in the
type namespace. Duplicate types and conflicts with explicit value, class,
enum, or namespace exports are reported, subject to declaration merging and
overload handling. Duplicate default exports, including type-only defaults,
are also checked.

Overload signatures describe one function rather than additional exports.
Ambient type-only aliases may coexist with overload-only declarations;
conflicting explicit value exports are still reported.

## Further Reading

- Lee Byron's [ES7] export proposal

[ES7]: https://github.com/leebyron/ecmascript-more-export-from
