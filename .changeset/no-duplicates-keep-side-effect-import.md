---
"eslint-plugin-import-x": patch
---

fix(no-duplicates): don't merge a later import into a side-effect import like `import './setup'`, since `order` could then move it and run the module later
