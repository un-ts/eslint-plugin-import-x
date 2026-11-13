---
"eslint-plugin-import-x": patch
---

fix(no-duplicates): treat entry points that share one declaration file but have their own `declare module` blocks, like `svelte` and `svelte/transition`, as different modules
