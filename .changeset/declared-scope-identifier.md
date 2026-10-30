---
"eslint-plugin-import-x": patch
---

fix(namespace): don't report members of a parameter that shadows a namespace import when the namespace is also used in the same scope, e.g. in a type annotation
