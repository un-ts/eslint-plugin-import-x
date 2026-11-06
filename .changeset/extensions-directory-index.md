---
"eslint-plugin-import-x": patch
---

fix(extensions): resolve directory imports to their index file in autofixes and suggestions, and only offer rewrites of resolved imports that point back to the same file.
