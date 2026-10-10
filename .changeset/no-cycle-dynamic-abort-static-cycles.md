---
"eslint-plugin-import-x": patch
---

fix(no-cycle): `allowUnsafeDynamicCyclicDependency` no longer hides static-only cycles that happen to sit in the same module as an unrelated dynamic import

Previously, `no-cycle`'s traversal bailed out of a module's **entire** remaining import list as soon as it found one path where any declaration was dynamic - `return` rather than `continue` inside the loop over `m.imports`. That meant:

- a purely static cycle declared _after_ an unrelated dynamic import earlier in the same file went unreported, and
- a path imported both statically and dynamically (the static declaration on its own closing a real cycle) was skipped entirely, because "any declaration to this path is dynamic" discarded the static declaration too.

Both are now handled per-declaration: only the dynamic declarations for a path are dropped when `allowUnsafeDynamicCyclicDependency` is set, and only that one path is skipped when nothing traversable remains - the module's other, unrelated import paths (and any static declaration to the very same path) are still checked. See [#515](https://github.com/un-ts/eslint-plugin-import-x/issues/515) for the repro that found this.
