# import-x/no-own-exports

<!-- end auto-generated rule header -->

Forbid a package from importing itself through its own `exports` map.

When the `package.json` closest to a file defines `exports`, Node.js lets that file import the package by its own name (a [package self-reference](https://nodejs.org/api/packages.html#self-referencing-a-package-using-its-name)). [`no-extraneous-dependencies`](./no-extraneous-dependencies.md) allows such imports. Use this rule in projects that want modules to reach the rest of their own package through relative paths instead.

Static `import` declarations, `export ... from` declarations, dynamic `import()` calls and `require()` calls with a literal specifier are checked, including subpaths such as `my-package/utils`. A package name that a resolver alias points at another package is not reported.

## Rule Details

Given the following `package.json`:

```json
{
  "name": "my-package",
  "exports": {
    ".": "./dist/index.js",
    "./utils": "./dist/utils.js"
  }
}
```

### Fail

```js
// src/foo.js
import { member } from 'my-package'
import { helper } from 'my-package/utils'
export * from 'my-package'

const pkg = require('my-package')
```

### Pass

```js
// src/foo.js
import { member } from './index.js'
import { helper } from './utils.js'

// a different package
import other from 'my-package-other'
```

A package without `exports` cannot import itself by name, so this rule does not report it; [`no-extraneous-dependencies`](./no-extraneous-dependencies.md) does.

## Options

This rule has the following options, with these defaults:

```js
"import-x/no-own-exports": ["error", {
  "allowInFiles": [],
  "ignoreTypeImports": false,
}]
```

### `allowInFiles`

An array of globs. Files matching any of them may import their own package, for example tests that exercise the package entry point as consumers would:

```js
"import-x/no-own-exports": ["error", { "allowInFiles": ["**/test/**", "**/*.spec.js"] }]
```

### `ignoreTypeImports`

Ignores type-only imports and exports, such as `import type { Foo } from 'my-package'` or `export type { Foo } from 'my-package'`. Defaults to `false`.

## When Not To Use It

If you use self-references on purpose, for example so that every module imports the package through its public entry points.
