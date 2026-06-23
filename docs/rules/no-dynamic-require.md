# import-x/no-dynamic-require

<!-- end auto-generated rule header -->

The `require` method from CommonJS is used to import modules from different files. Unlike the ES6 `import` syntax, it can be given expressions that will be resolved at runtime. While this is sometimes necessary and useful, in most cases it isn't. Using expressions (for instance, concatenating a path and variable) as the argument makes it harder for tools to do static code analysis, or to find where in the codebase a module is used.

This rule forbids every call to `require()` that uses expressions for the module name argument.

## Options

This rule supports the following options:

### `esmodule`

By default, this rule does not report dynamic `import()` expressions.

Given `{ "esmodule": true }`:

<!-- lint disable no-duplicate-headings-in-section -->

### Fail

```js
import(name)
import('../' + name)
import(`../${name}`)
import(name())
```

<!-- lint disable no-duplicate-headings-in-section -->

### Pass

```js
import('foo')
import(`foo`)
import('./foo')
import('@scope/foo')
```

## Rule Details

### Fail

```js
require(name)
require('../' + name)
require(`../${name}`)
require(name())
```

### Pass

```js
require('../name')
require(`../name`)
```
