# import-x/extensions

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

> [!NOTE]
>
> This rule is only fixable when the `fix` option is set to `true` for compatibility, otherwise `suggestions` will be provided instead.
>
> Example:
>
> ```json
> "import-x/extensions": ["error", "never", { "fix": true }]
> ```
>
> It will change to be automatically fixable in the next major version.

Some file resolve algorithms allow you to omit the file extension within the import source path. For example the `node` resolver (which does not yet support ESM/`import`) can resolve `./foo/bar` to the absolute path `/User/someone/foo/bar.js` because the `.js` extension is resolved automatically by default in CJS. Depending on the resolver you can configure more extensions to get resolved automatically.

In order to provide a consistent use of file extensions across your code base, this rule can enforce or disallow the use of certain file extensions.

## Rule Details

This rule either takes one string option, one object option, or a string and an object option. If it is the string `"never"` (the default value), then the rule forbids the use for any extension. If it is the string `"always"`, then the rule enforces the use of extensions for all import statements. If it is the string `"ignorePackages"`, then the rule enforces the use of extensions for all import statements except package imports.

```json
"import-x/extensions": [<severity>, "never" | "always" | "ignorePackages"]
```

By providing an object you can configure each extension separately.

```json
"import-x/extensions": [<severity>, {
  <extension>: "never" | "always" | "ignorePackages"
}]
```

For example `{ "js": "always", "json": "never" }` would always enforce the use of the `.js` extension but never allow the use of the `.json` extension.

By providing both a string and an object, the string will set the default setting for all extensions, and the object can be used to set granular overrides for specific extensions.

```json
"import-x/extensions": [
  <severity>,
  "never" | "always" | "ignorePackages",
  {
    <extension>: "never" | "always" | "ignorePackages"
  }
]
```

For example, `["error", "never", { "svg": "always" }]` would require that all extensions are omitted, except for "svg".

`ignorePackages` can be set as a separate boolean option like this:

```json
"import-x/extensions": [
  <severity>,
  "never" | "always" | "ignorePackages",
  {
    ignorePackages: true | false,
    pattern: {
      <extension>: "never" | "always" | "ignorePackages"
    }
  }
]
```

In that case, if you still want to specify extensions, you can do so inside the **pattern** property.
Default value of `ignorePackages` is `false`.

By default, `import type` and `export type` style imports/exports are ignored. If you want to check them as well, you can set the `checkTypeImports` option to `true`.

### Exception

When disallowing the use of certain extensions this rule makes an exception and allows the use of extension when the file would not be resolvable without extension.

For example, given the following folder structure:

```pt
├── foo
│   ├── bar.js
│   ├── bar.json
```

and this import statement:

```js
import bar from './foo/bar.json'
```

then the extension can’t be omitted because it would then resolve to `./foo/bar.js`.

### Examples

The following patterns are considered problems when configuration set to "never":

```js
import foo from './foo.js'

import bar from './bar.json'

import Component from './Component.jsx'

import express from 'express/index.js'
```

The following patterns are not considered problems when configuration set to "never":

```js
import foo from './foo'

import bar from './bar'

import Component from './Component'

import express from 'express/index'

import * as path from 'path'
```

The following patterns are considered problems when the configuration is set to "never" and the option "checkTypeImports" is set to `true`:

```js
import type { Foo } from './foo.ts';
export type { Foo } from './foo.ts';
```

The following patterns are considered problems when configuration set to "always":

```js
import foo from './foo'

import bar from './bar'

import Component from './Component'

import foo from '@/foo'
```

The following patterns are not considered problems when configuration set to "always":

```js
import foo from './foo.js'

import bar from './bar.json'

import Component from './Component.jsx'

import * as path from 'path'

import foo from '@/foo.js'
```

The following patterns are considered problems when configuration set to "ignorePackages":

```js
import foo from './foo'

import bar from './bar'

import Component from './Component'
```

The following patterns are not considered problems when configuration set to "ignorePackages":

```js
import foo from './foo.js'

import bar from './bar.json'

import Component from './Component.jsx'

import express from 'express'

import foo from '@/foo'
```

The following patterns are not considered problems when configuration set to `['error', 'always', {ignorePackages: true} ]`:

```js
import Component from './Component.jsx'

import baz from 'foo/baz.js'

import express from 'express'

import foo from '@/foo'
```

The following patterns are considered problems when the configuration is set to "always" and the option "checkTypeImports" is set to `true`:

```js
import type { Foo } from './foo';
export type { Foo } from './foo';
```

## When Not To Use It

If you are not concerned about a consistent usage of file extension.

In the future, when this rule supports native node ESM resolution, and the plugin is configured to use native rather than transpiled ESM (a config option that is not yet available) - setting this to `always` will have no effect.
