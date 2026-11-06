---
"eslint-plugin-import-x": patch
---

fix(extensions): resolve directory imports to their index file in autofixes and suggestions, and avoid package subpath rewrites that do not resolve back to the original file.
