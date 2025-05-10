# import-x/avoid-barrel-files

This rule disallows _authoring_ barrel files in your project.

## Rule Details

Examples of **incorrect** code for this rule:

```js
export { foo } from 'foo'
export { bar } from 'bar'
export { baz } from 'baz'
```

## Options

This rule has the following options, with these defaults:

```js
"import-x/avoid-barrel-files": ["error", {
  "amountOfExportsToConsiderModuleAsBarrel": 5
}]
```

### `amountOfExportsToConsiderModuleAsBarrel`

This option sets the number of exports that will be considered a barrel file. Anything over will trigger the rule.
