# Resolver spec

To the extent it is feasible, trailing versions of the resolvers will continue to be supported, at least until a major version bump on the plugin proper.

Currently, version 1 is assumed if no `interfaceVersion` is available. (didn't think to define it until v2, heh. 😅)

- [v3](#v3)
  - [Required `interfaceVersion: number`](#required-interfaceversion-number)
  - [Required `resolve`](#required-resolve)
    - [`useRuleContext` and `getTsconfigWithContext`](#userulecontext-and-gettsconfigwithcontext)
    - [Arguments](#arguments)
      - [`source`](#source)
      - [`file`](#file)
  - [Optional `name`](#optional-name)
  - [Example](#example)
- [v2](#v2)
  - [`interfaceVersion: number`](#interfaceversion-number)
  - [`resolve`](#resolve)
    - [`useRuleContext` and `getTsconfigWithContext`](#userulecontext-and-gettsconfigwithcontext-1)
    - [Arguments](#arguments-1)
      - [`source`](#source-1)
      - [`file`](#file-1)
      - [`config`](#config)
  - [Example](#example-1)
- [Shared `resolve` return value](#shared-resolve-return-value)

## v3

Resolvers **must** export the following (with `name` being optional):

### Required `interfaceVersion: number`

The following document currently describes version 3 of the resolver interface. As such, a resolver implementing this version should

```js
export const interfaceVersion = 3
```

or

```js
exports.interfaceVersion = 3
```

### Required `resolve`

Signature: `(source: string, file: string) => { found: boolean, path?: string | null }`

Given:

```js
// /some/path/to/module.js
import ... from './imported-file'
```

and

```js
// eslint.config.js
import { useRuleContext, getTsconfigWithContext } from 'eslint-import-context'
import { createNodeResolver } from 'eslint-plugin-import-x'

export default [
  {
    settings: {
      'import/resolver-next': [
        {
          name: 'my-cool-resolver',
          interfaceVersion: 3,
          resolve(source, file) {
            const ruleContext = useRuleContext()
            const tsconfig = getTsconfigWithContext(ruleContext)
            // use a factory to get config outside of the resolver
          },
        },
        createNodeResolver({
          modules: [a, b, c],
        }),
      ],
    },
  },
]
```

#### `useRuleContext` and `getTsconfigWithContext`

They are powered by [eslint-import-context] in the above example, but they are not required to be used, and please be aware that `useRuleContext` could return `undefined` when using [eslint-plugin-import] or old versions of [eslint-plugin-import-x].

#### Arguments

The arguments provided will be:

##### `source`

the module identifier (`./imported-file`).

##### `file`

the absolute path to the file making the import (`/some/path/to/module.js`)

### Optional `name`

the resolver name used in logs/debug output

### Example

Here is most of the [New Node resolver] at the time of this writing. It is just a wrapper around [`unrs-resolver`][unrs-resolver]:

```js
import module from 'node:module'
import path from 'node:path'

import { ResolverFactory } from 'unrs-resolver'
import type { NapiResolveOptions } from 'unrs-resolver'

import type { NewResolver } from './types.js'

export function createNodeResolver({
  extensions = ['.mjs', '.cjs', '.js', '.json', '.node'],
  conditionNames = ['import', 'require', 'default'],
  mainFields = ['module', 'main'],
  ...restOptions
}: NapiResolveOptions = {}): NewResolver {
  const resolver = new ResolverFactory({
    extensions,
    conditionNames,
    mainFields,
    ...restOptions,
  })

  // shared context across all resolve calls

  return {
    interfaceVersion: 3,
    name: 'eslint-plugin-import-x:node',
    resolve(modulePath, sourceFile) {
      if (module.isBuiltin(modulePath)) {
        return { found: true, path: null }
      }

      if (modulePath.startsWith('data:')) {
        return { found: true, path: null }
      }

      try {
        const resolved = resolver.sync(path.dirname(sourceFile), modulePath)
        if (resolved.path) {
          return { found: true, path: resolved.path }
        }
        return { found: false }
      } catch {
        return { found: false }
      }
    },
  }
}
```

## v2

Resolvers **must** export two names:

### `interfaceVersion: number`

The following document currently describes version 2 of the resolver interface. As such, a resolver implementing this version should

```js
export const interfaceVersion = 2
```

or

```js
exports.interfaceVersion = 2
```

### `resolve`

Signature: `(source: string, file: string, config?: unknown) => { found: boolean, path?: string | null }`

Given:

```js
// /some/path/to/module.js
import ... from './imported-file'
```

and

```yaml
# .eslintrc.yml
---
settings:
  import/resolver:
    my-cool-resolver: [some, stuff]
    node: { paths: [a, b, c] }
```

#### `useRuleContext` and `getTsconfigWithContext`

They are also available via [eslint-import-context] in the `my-cool-resolver` example, same as [v3](#userulecontext-and-gettsconfigwithcontext).

#### Arguments

The arguments provided will be:

##### `source`

the module identifier (`./imported-file`).

##### `file`

the absolute path to the file making the import (`/some/path/to/module.js`)

##### `config`

an object provided via the `import/resolver` setting. `my-cool-resolver` will get `["some", "stuff"]` as its `config`, while
`node` will get `{ "paths": ["a", "b", "c"] }` provided as `config`.

### Example

Here is most of the [Node resolver] at the time of this writing. It is just a wrapper around substack/Browserify's synchronous [`resolve`][resolve]:

```js
const resolve = require('resolve/sync')
const isCoreModule = require('is-core-module')

exports.resolve = function (source, file, config) {
  if (isCoreModule(source)) {
    return { found: true, path: null }
  }
  try {
    return { found: true, path: resolve(source, opts(file, config)) }
  } catch (err) {
    return { found: false }
  }
}
```

## Shared `resolve` return value

The first resolver to return `{ found: true }` is considered the source of truth. The returned object has:

- `found`: `true` if the `source` module can be resolved relative to `file`, else `false`
- `path`: an absolute path `string` if the module can be located on the filesystem; else, `null`.

An example of a `null` path is a Node core module, such as `fs` or `crypto`. These modules can always be resolved, but the path need not be provided, as the plugin will not attempt to parse core modules at this time.

If the resolver cannot resolve `source` relative to `file`, it should just return `{ found: false }`. No `path` key is needed in this case.

[New Node resolver]: https://github.com/un-ts/eslint-plugin-import-x/blob/master/src/node-resolver.ts
[Node resolver]: https://github.com/import-js/eslint-plugin-import/blob/main/resolvers/node/index.js
[eslint-import-context]: https://github.com/un-ts/eslint-import-context
[eslint-plugin-import]: https://github.com/import-js/eslint-plugin-import
[eslint-plugin-import-x]: https://github.com/un-ts/eslint-plugin-import-x
[resolve]: https://github.com/browserify/resolve
[unrs-resolver]: https://github.com/unrs/unrs-resolver
