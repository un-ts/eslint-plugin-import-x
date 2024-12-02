The PR implements the new resolver design proposed in https://github.com/un-ts/eslint-plugin-import-x/issues/40#issuecomment-2381444266

----

### For `eslint-plugin-import-x` users

Like the ESLint flat config allows you to use any js objects (e.g. import and require) as ESLint plugins, the new `eslint-plugin-import-x` resolver settings allow you to use any js objects as custom resolvers through the new setting `import-x/resolver-next`:

```js
// eslint.config.js
import { createTsResolver } from '#custom-resolver';
const { createOxcResolver } = require('path/to/a/custom/resolver');

const nodeResolverObject = {
  interfaceVersion: 3,
  name: 'my-custom-eslint-import-resolver',
  resolve(modPath, sourcePath) {
  };
};

module.exports = {
  settings: {
    // multiple resolvers
    'import-x/resolver-next': [
      nodeResolverObject,
      createTsResolver(enhancedResolverOptions),
      createOxcResolver(oxcOptions),
    ],
    // single resolver:
    'import-x/resolver-next': [createOxcResolver(oxcOptions)]
  }
}
```

The new `import-x/resolver-next` no longer accepts strings as the resolver, thus will not be compatible with the ESLint legacy config (a.k.a. `.eslintrc`). Those who are still using the ESLint legacy config should stick with `import-x/resolver`.

In the next major version of `eslint-plugin-import-x` (v5), we will rename the currently existing `import-x/resolver` to `import-x/resolver-legacy` (which still allows the existing ESLint legacy config users to use their existing resolver settings), and `import-x/resolver-next` will become the new `import-x/resolver`. When ESLint v9 (the last ESLint version with ESLint legacy config support) reaches EOL in the future, we will remove `import-x/resolver-legacy`.

We have also made a few breaking changes to the new resolver API design, so you can't use existing custom resolvers directly with `import-x/resolver-next`:

```js
// An example of the current `import-x/resolver` settings
module.exports = {
  settings: {
    'import-x/resolver': {
      node: nodeResolverOpt
      webpack: webpackResolverOpt,
      'custom-resolver': customResolverOpt
    }
  }
}

// When migrating to `import-x/resolver-next`, you CAN'T use legacy versions of resolvers directly:
module.exports = {
  settings: {
    // THIS WON'T WORK, the resolver interface required for `import-x/resolver-next` is different.
    'import-x/resolver-next': [
       require('eslint-import-resolver-node'),
       require('eslint-import-resolver-webpack'),
       require('some-custom-resolver')
    ];
  }
}
```

For easier migration, the PR also introduces a compat utility `importXResolverCompat` that you can use in your `eslint.config.js`:

```js
// eslint.config.js
import eslintPluginImportX, { importXResolverCompat } from 'eslint-plugin-import-x';
// or
const eslintPluginImportX = require('eslint-plugin-import-x');
const { importXResolverCompat } = eslintPluginImportX;

module.exports = {
  settings: {
    // THIS WILL WORK as you have wrapped the previous version of resolvers with the `importXResolverCompat`
    'import-x/resolver-next': [
       importXResolverCompat(require('eslint-import-resolver-node'), nodeResolveOptions),
       importXResolverCompat(require('eslint-import-resolver-webpack'), webpackResolveOptions),
       importXResolverCompat(require('some-custom-resolver'), {})
    ];
  }
}
```

### For custom import resolver developers

This is the new API design of the resolver interface:

```ts
export interface NewResolver {
  interfaceVersion: 3,
  name?: string, // This will be included in the debug log
  resolve: (modulePath: string, sourceFile: string) => ResolvedResult
}

// The `ResultNotFound` (returned when not resolved) is the same, no changes
export interface ResultNotFound {
  found: false
  path?: undefined
}

// The `ResultFound` (returned resolve result) is also the same, no changes
export interface ResultFound {
  found: true
  path: string | null
}

export type ResolvedResult = ResultNotFound | ResultFound
```

You will be able to import `NewResolver` from `eslint-plugin-import-x/types`.

The most notable change is that `eslint-plugin-import-x` no longer passes the third argument (`options`) to the `resolve` function.

We encourage custom resolvers' authors to consume the options outside the actual `resolve` function implementation. You can export a factory function to accept the options, this factory function will then be called inside the `eslint.config.js` to get the actual resolver:

```js
// custom-resolver.js
exports.createCustomResolver = (options) => {
  // The options are consumed outside the `resolve` function.
  const resolverInstance = new ResolverFactory(options);

  return {
    name: 'custom-resolver',
    interfaceVersion: 3,
    resolve(mod, source) {
      const found = resolverInstance.resolve(mod, {});

      // Of course, you still have access to the `options` variable here inside
      // the `resolve` function. That's the power of JavaScript Closures~
    }
  }
};

// eslint.config.js
const { createCustomResolver } = require('custom-resolver')

module.exports = {
  settings: {
    'import-x/resolver-next': [
       createCustomResolver(options)
    ];
  }
}
```

This allows you to create a reusable resolver instance to improve the performance. With the existing version of the resolver interface, because the options are passed to the `resolver` function, you will have to create a resolver instance every time the `resolve` function is called:

```js
module.exports = {
  interfaceVersion: 2,
  resolve(mod, source) {
    // every time the `resolve` function is called, a new instance is created
    // This is very slow
    const resolverInstance = ResolverFactory.createResolver({});
    const found = resolverInstance.resolve(mod, {});
  }
}
```

With the factory function pattern, you can create a resolver instance beforehand:

```js
exports.createCustomResolver = (options) => {
  // `enhance-resolve` allows you to create a reusable instance:
  const resolverInstance = ResolverFactory.createResolver({});
  const resolverInstance = enhanceResolve.create({});

  // `oxc-resolver` also allows you to create a reusable instance:
  const resolverInstance = new ResolverFactory({});

  return {
    name: 'custom-resolver',
    interfaceVersion: 3,
    resolve(mod, source) {
      // the same re-usable instance is shared across `resolve` invocations.
      // more performant
      const found = resolverInstance.resolve(mod, {});
    }
  }
};
```
