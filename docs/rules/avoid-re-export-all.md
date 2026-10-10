# import-x/avoid-re-export-all

<!-- end auto-generated rule header -->

This rule forbids exporting `*` from a module as it can lead to unused imports and prevent treeshaking.

## Rule Details

Examples of **incorrect** code for this rule:

```js
export * from 'foo'
export * as foo from 'foo'
```

## Notes

Type-only re-exports — `export type * from 'foo'` and
`export type * as foo from 'foo'` — are erased at runtime and are not reported.
