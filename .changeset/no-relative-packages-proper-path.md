---
"eslint-plugin-import-x": patch
---

fix(no-relative-packages): keep the imported path when suggesting the package import

The suggested package import was built from the directory of the resolved file plus the last segment of the import path. An extensionless import of a file named like its package directory (`../bar/src/bar`) became `bar/src`, which resolves to another module, and a directory import (`../bar/src`) became `bar/src/src`. The path below the package root is now taken from the import itself.
