---
"eslint-plugin-import-x": patch
---

Prevent `ExportMap`'s cache is being tainted by incompatible parser (e.g. old `babel-eslint`). The cache is now skipped w/ incompatible parsers, which might introduce performance impacts only for those who are using incompatible parsers. (https://github.com/import-js/eslint-plugin-import/pull/3062)
