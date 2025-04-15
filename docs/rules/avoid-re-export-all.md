# import-x/avoid-re-export-all

This rule forbids exporting `*` from a module as it can lead to unused imports and prevent treeshaking.

## Rule Details

Examples of **incorrect** code for this rule:

```js
export * from 'foo'
export * as foo from 'foo'
```
