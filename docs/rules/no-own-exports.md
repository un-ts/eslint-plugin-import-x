# import-x/no-own-exports

<!-- end auto-generated rule header -->

Forbid a package from importing itself through its own `exports` map.

When the `package.json` closest to a file defines `name` and a non-null `exports` field, Node.js lets that file import the paths `exports` exposes by the package's own name (a [package self-reference](https://nodejs.org/api/packages.html#self-referencing-a-package-using-its-name)). [`no-extraneous-dependencies`](./no-extraneous-dependencies.md) allows such imports. Use this rule in projects that want modules to reach the rest of their own package through relative paths instead.

Static `import` declarations, `export ... from` declarations, dynamic `import()` calls and `require()` calls with a literal specifier are checked, including subpaths such as `my-package/utils`.

Only paths that `exports` exposes are reported, since no others can be imported by package name: the bare package name needs a root (`"."`) export, and a subpath needs a matching key or `*` pattern that is not mapped to `null`. Conditions are not evaluated, so a path counts as exported when any condition maps it to a file. Importing a path that is not exported fails at runtime instead (Node.js throws `ERR_PACKAGE_PATH_NOT_EXPORTED`).

A package name that a resolver alias points at another package is not reported, and neither is one that resolves to a built-in module (Node.js loads a built-in before a self-reference).

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

This rule does not report packages without `exports` (or with `exports: null`), since they cannot use a self-reference. Such a package can still import itself through `node_modules`, for example through a workspace link. [`no-extraneous-dependencies`](./no-extraneous-dependencies.md) may report that import (`selfImport`), but it skips imports it classifies as internal unless `includeInternal` is set, and skips the names listed in its `whitelist`.

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
