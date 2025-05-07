# import-x/avoid-importing-barrel-files

This rule aims to avoid importing barrel files that lead to loading large module graphs. This rule is different from the `avoid-barrel-files` rule, which lints against _authoring_ barrel files. This rule lints against _importing_ barrel files.

## Rule Details

Examples of **incorrect** code for this rule:

```js
// If `foo` is a barrel file leading to a module graph of more than 20 modules
export { foo } from 'foo'
```

## Options

This rule has the following options, with these defaults:

```js
"import-x/avoid-importing-barrel-files": ["error", {
  allowList: [],
  maxModuleGraphSizeAllowed: 20,
  amountOfExportsToConsiderModuleAsBarrel: 3,
  exportConditions: ["node", "import"],
  mainFields: ["module", "browser", "main"],
  extensions: [".js", ".ts", ".tsx", ".jsx", ".json", ".node"],
}]
```

### `allowList`

List of modules from which to allow barrel files being imported.

### `maxModuleGraphSizeAllowed`

Maximum allowed module graph size. If an imported module results in loading more than this many modules, it will be considered a barrel file.

### `amountOfExportsToConsiderModuleAsBarrel`

Amount of exports to consider a module as a barrel file.

### `exportConditions`

Export conditions to use when resolving modules.

### `mainFields`

Main fields to use when resolving modules.

### `extensions`

Extensions to use when resolving modules.

### `tsconfig`

TSConfig options to pass to the underlying resolver when resolving modules.

This can be useful when resolving project references in TypeScript.

### `alias`

The rule can accept an `alias` option whose value can be an object that matches Webpack's [resolve.alias](https://webpack.js.org/configuration/resolve/) configuration.

```js
// eslint.config.js
import path from 'node:path'
import { defineConfig } from 'eslint/config'
import importPlugin from 'eslint-plugin-import-x'

export default defineConfig([
  {
    plugins: {
      'import-x': importPlugin,
    },
    rules: {
      'import-x/avoid-importing-barrel-files': [
        'error',
        {
          alias: {
            // "@/foo/bar.js" => "./src/foo/bar.js"
            '@': [path.resolve('.', 'src')],
          },
        },
      ],
    },
  },
])
```
