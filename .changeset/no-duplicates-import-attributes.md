---
"eslint-plugin-import-x": patch
---

fix(no-duplicates): imports of one path with different attributes are not duplicates, and the autofix no longer drops an attribute, mistakes the braces of `with {...}` for the braces of the specifiers, or takes a `resolution-mode` import out of `import type`
