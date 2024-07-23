---
"eslint-plugin-import-x": patch
---

Reverts #111. The introduction of SCC causes extra overhead that overcomes the early return it introduced.

A new `no-cycle-next` rule is being implemented using the graph. It won't be backward compatible with the current rule `no-cycle`. The current `no-cycle` rule will become `no-cycle-legacy` in the next major version.
