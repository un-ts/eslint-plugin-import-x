# import-x/avoid-namespace-import

This rule forbids the use of namespace imports as they can lead to unused imports and prevent treeshaking.

## Rule Details

Examples of **incorrect** code for this rule:

```js
import * as foo from 'foo'
```

## Options

This rule has the following options, with these defaults:

```js
"import-x/avoid-barrel-files": ["error", {
  allowList: []
}]
```

### `allowList`

A list of namespace imports that are allowed.
