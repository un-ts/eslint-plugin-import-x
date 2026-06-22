---
"eslint-plugin-import-x": patch
---

Fixed `no-unresolved` crashing when case-sensitive path checks encounter `EACCES` or `EPERM` on an ancestor directory.
