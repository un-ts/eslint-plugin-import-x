# import-x/avoid-namespace-import

<!-- end auto-generated rule header -->

This rule forbids the use of namespace imports as they can lead to unused imports and prevent treeshaking. Unlike [`no-namespace`](no-namespace.md), which enforces the same style with an autofix and supports glob `ignore` patterns, this rule belongs to the performance category and uses an exact `allowList`.

## Rule Details

Examples of **incorrect** code for this rule:

```js
import * as foo from 'foo'
```

## Options

This rule has the following options, with these defaults:

```js
"import-x/avoid-namespace-import": ["error", {
  allowList: []
}]
```

### `allowList`

A list of module specifiers whose namespace imports are allowed.
