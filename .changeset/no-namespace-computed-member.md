---
"eslint-plugin-import-x": patch
---

fix(no-namespace): don't autofix computed member access on the namespace

`foo[key]` was fixed as if it were `foo.key`, importing an export named `key` and dropping the lookup, and `list[foo]` was rewritten the same way. Both keep the namespace import now, and the rule still reports them.
