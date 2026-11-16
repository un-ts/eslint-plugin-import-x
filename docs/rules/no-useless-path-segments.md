# import-x/no-useless-path-segments

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Use this rule to prevent unnecessary path segments in import and require statements.

## Rule Details

Given the following folder structure:

```pt
my-project
├── app.js
├── footer.js
├── header.js
└── helpers.js
└── helpers
    └── index.js
├── index.js
└── pages
    ├── about.js
    ├── contact.js
    └── index.js
```

The following patterns are considered problems:

```js
/** In my-project/app.js */

import './../my-project/pages/about.js' // should be "./pages/about.js"
import './../my-project/pages/about' // should be "./pages/about"
import '../my-project/pages/about.js' // should be "./pages/about.js"
import '../my-project/pages/about' // should be "./pages/about"
import './pages//about' // should be "./pages/about"
import './pages/' // should be "./pages"
import './pages/index' // should be "./pages" (except if there is a ./pages.js file)
import './pages/index.js' // should be "./pages" (except if there is a ./pages.js file)
```

The following patterns are NOT considered problems:

```js
/** In my-project/app.js */

import './header.js'
import './pages'
import './pages/about'
import '.'
import '..'
import fs from 'fs'
```

## Options

### noUselessIndex

If you want to detect unnecessary `/index` or `/index.js` (depending on the specified file extensions, see below) imports in your paths, you can enable the option `noUselessIndex`. By default it is set to `false`:

```js
"import-x/no-useless-path-segments": ["error", {
  noUselessIndex: true,
}]
```

Additionally to the patterns described above, the following imports are considered problems if `noUselessIndex` is enabled:

```js
// in my-project/app.js
import './helpers/index' // should be "./helpers/" (not auto-fixable to `./helpers` because this would lead to an ambiguous import of `./helpers.js` and `./helpers/index.js`)
import './pages/index' // should be "./pages" (auto-fixable)
import './pages/index.js' // should be "./pages" (auto-fixable)
```

The option also checks aliased imports (for example `@/pages/index` with a `@` path alias) when they resolve to a file inside the project. These are only reported when the shorter path resolves to the same file and keeps more than the alias itself (`@/index` is not changed to `@`). An import is never shortened to an alias root either, such as `app/components/index` to `app/components` with an `app/components` alias: a wildcard mapping `app/components/*` does not guarantee that the bare root is a valid import path. The shorter path is only used when a sibling file of the target directory resolves through the same prefix, which shows the alias root sits higher up.

```js
import '@/pages/index' // should be "@/pages" (auto-fixable)
```

These checks use the resolver configured in `import-x/resolver-next`, not the TypeScript compiler or your bundler. If the resolver accepts a path that another tool does not, the fix can produce an import that only that tool rejects. For example, a TypeScript `paths` entry `"app/fixtures/importType/*"` maps `app/fixtures/importType/index` but not the bare `app/fixtures/importType`. Keep the resolver settings in line with your `tsconfig.json` (for example with `eslint-import-resolver-typescript`), or turn `noUselessIndex` off if they differ. Node subpath imports (`#app/pages/index`) are not checked, because ESM does not accept a bare directory path there.

Note: `noUselessIndex` only avoids ambiguous imports for `.js` files if you haven't specified other resolved file extensions. See [Settings: import-x/extensions](https://github.com/import-js/eslint-plugin-import#importextensions) for details.

### commonjs

When set to `true`, this rule checks CommonJS imports. Default to `false`.
