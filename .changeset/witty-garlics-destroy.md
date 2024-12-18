---
"eslint-plugin-import-x": minor
---

When `eslint-plugin-import-x` was forked from `eslint-plugin-import`, we copied over the default resolver (which is `eslint-import-resolver-node`) as well. However, this resolver doesn't supports `exports` in the `package.json` file, and the current maintainer of the `eslint-import-resolver-node` (@ljharb) simply refuses implementing this feature and he even locked the issue (https://github.com/import-js/eslint-plugin-import/issues/1810).

So we decided to implement our own resolver that "just works". The new resolver is built upon the [`@dual-bundle/import-meta-resolve`](https://www.npmjs.com/package/@dual-bundle/import-meta-resolve) that implements the full Node.js [Resolver Algorithm](https://nodejs.org/dist/v14.21.3/docs/api/esm.html#esm_resolver_algorithm). The resolver is shipped with the `eslint-plugin-import-x` package.

We do not plan to implement reading `baseUrl` and `paths` from the `tsconfig.json` file in this resolver. If you need this feature, please checkout [eslint-import-resolver-typescript](https://www.npmjs.com/package/eslint-import-resolver-typescript), [eslint-import-resolver-oxc](https://www.npmjs.com/package/eslint-import-resolver-oxc), [eslint-import-resolver-next](https://www.npmjs.com/package/eslint-import-resolver-next), or other similar resolvers.

In the next major version of `eslint-plugin-import-x`, we will remove the `eslint-import-resolver-node` and use this new resolver by default. In the meantime, you can try out this new resolver by setting the `import-x/resolver-next` option in your `eslint.config.js` file:

```js
// eslint.config.js
const eslintPluginImportX = require('eslint-plugin-import-x');
const { createNodeResolver } = eslintPluginImportX;

module.exports = {
  plugins: {
    'import-x': eslintPluginImportX,
  },
  settings: {
    'import-x/resolver-next': [
      createNodeResolver({
        /**
         * Optional, the import conditions the resolver will used when reading the exports map from "package.json"
         * @default new Set(['default', 'module', 'import', 'require'])
         */
        conditions: new Set(['default', 'module', 'import', 'require']),
        /**
         * Optional, keep symlinks instead of resolving them
         * @default false
         */
        preserveSymlinks: false
      }),
      // you can add more resolvers down below
      require('eslint-import-resolver-typescript').createTypeScriptImportResolver(
        /** options of eslint-import-resolver-typescript */
      )
    ],
  },
};
```

Note that you can't use this new resolver with the `eslint-plugin-import` package as we only implemented the import resolver interface v3 (For more details about the import resolver interface v3, please check out [#192](https://github.com/un-ts/eslint-plugin-import-x/pull/192)).
