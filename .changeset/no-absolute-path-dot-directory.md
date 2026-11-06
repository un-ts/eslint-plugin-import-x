---
"eslint-plugin-import-x": patch
---

fix(no-absolute-path): prefix `./` when the fixed path starts with a dot directory such as `.config/`, which would otherwise turn into a package import
