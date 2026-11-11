# import-x/no-relative-parent-imports

<!-- end auto-generated rule header -->

Use this rule to prevent imports to folders in relative parent paths.

This rule is useful for enforcing tree-like folder structures instead of complex graph-like folder structures. While this restriction might be a departure from Node's default resolution style, it can lead large, complex codebases to be easier to maintain. If you've ever had debates over "where to put files" this rule is for you.

To fix violations of this rule there are three general strategies. Given this example:

```pt
numbers
└── three.js
add.js
```

```js
// ./add.js
export default function (numbers) {
  return numbers.reduce((sum, n) => sum + n, 0);
}

// ./numbers/three.js
import add from '../add'; // violates import-x/no-relative-parent-imports

export default function three() {
  return add([1, 2]);
}
```

You can,

1. Move the file to be in a sibling folder (or higher) of the dependency.

   `three.js` could be be in the same folder as `add.js`:

   ```pt
   three.js
   add.js
   ```

   or since `add` doesn't have any imports, it could be in it's own directory (namespace):

   ```pt
   math
   └── add.js
   three.js
   ```

2. Pass the dependency as an argument at runtime (dependency injection)

   ```js
   // three.js
   export default function three(add) {
     return add([1, 2])
   }

   // somewhere else when you use `three.js`:
   import add from './add'
   import three from './numbers/three'
   console.log(three(add))
   ```

3. Make the dependency a package so it's globally available to all files in your project:

   ```js
   import add from 'add' // from https://www.npmjs.com/package/add
   export default function three() {
     return add([1, 2])
   }
   ```

These are (respectively) static, dynamic & global solutions to graph-like dependency resolution.

## Examples

Given the following folder structure:

```pt
my-project
├── lib
│   ├── a.js
│   └── b.js
└── main.js
```

And the .eslintrc file:

```json
{
  ...
  "rules": {
    "import-x/no-relative-parent-imports": "error"
  }
}
```

The following patterns are considered problems:

```js
/** In my-project/lib/a.js */

import bar from '../main' // Import parent file using a relative path
```

The following patterns are NOT considered problems:

```js
/** In my-project/main.js */

import foo from 'foo' // Import package using module path
import a from './lib/a' // Import child file using relative path

/** In my-project/lib/a.js */

import b from './b' // Import sibling file using relative path
```

## Options

This rule accepts an options object with the following properties, shared with other rules that visit module specifiers:

- `commonjs` (default: `false`): also check `require` calls
- `amd` (default: `false`): also check AMD `require` and `define` calls
- `esmodule` (default: `true`): check ES module `import` and `export` declarations
- `ignore`: an array of `RegExp` or `RegExp` pattern strings, matched against the import specifier; matching imports are not checked

It also accepts this rule-specific option:

- `ignorePrivateImports` (default: `false`): do not check [subpath imports](https://nodejs.org/api/packages.html#subpath-imports) declared in the `imports` field of the closest `package.json`

### `ignore`

The rule checks the resolved path of an import, so a specifier that does not start with `../` is still reported when it resolves to a file in a parent directory of the same package. This is the case for [subpath imports](https://nodejs.org/api/packages.html#subpath-imports) and path aliases:

```js
/** In my-project/lib/a.js, where "#root/*" maps to "./*" */

import main from '#root/main.js' // reported, resolves to my-project/main.js
```

An alias that resolves outside the package is treated as external and is not checked.

Use `ignore` to skip such specifiers:

```json
{
  "rules": {
    "import-x/no-relative-parent-imports": ["error", { "ignore": ["^#"] }]
  }
}
```

With this configuration `#src/main.js` is allowed, while `../main` is still reported.

### `ignorePrivateImports`

`"ignore": ["^#"]` skips every specifier starting with `#`, including path aliases from `tsconfig.json`. To skip only the subpath imports declared in the `imports` field of the closest `package.json`, enable `ignorePrivateImports`:

```json
{
  "rules": {
    "import-x/no-relative-parent-imports": [
      "error",
      { "ignorePrivateImports": true }
    ]
  }
}
```

With this configuration and `"imports": { "#root/*": "./*" }` in `my-project/package.json`, `#root/main.js` is allowed, while a `tsconfig.json` path alias such as `#src/main.js` and `../main` are still reported.
