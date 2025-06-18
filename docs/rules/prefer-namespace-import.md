# import-x/prefer-namespace-import

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Enforce using namespace imports for specific modules, like `react`/`react-dom`, etc.

## Rule Details

### rule schema

```jsonc
{
  "import-x/prefer-namespace-import": [
    "error", // or "off", "warn"
    {
      "patterns": [
        // Exact match
        "foo",
        // RegExp
        "/^prefix-/",
      ],
    },
  ],
}
```

### Config Options

`patterns` is an array of strings or `RegExp` patterns that specify which modules should be imported using namespace imports.

#### Example

```js
/*eslint import-x/prefer-namespace-import: [2, { patterns: ['react'] }]*/

// bad
import React from 'react'

// good
import * as React from 'react'

// ignored
import ReactDOM from 'react-dom'
```
