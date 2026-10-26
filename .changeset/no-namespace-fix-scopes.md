---
"eslint-plugin-import-x": patch
---

fix(no-namespace): check all enclosing scopes for name conflicts in the autofix

The autofix only looked at the innermost scope of each `ns.name` reference and its parent for names that would shadow the new import, so a variable declared further out (or an undeclared global used elsewhere in the module) changed what the rewritten reference pointed to. It also turned `ns.default` and `ns['some-key']` into named imports that aren't valid syntax; those are now reported without a fix.
