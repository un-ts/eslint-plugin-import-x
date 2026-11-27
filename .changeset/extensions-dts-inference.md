---
"eslint-plugin-import-x": patch
---

fix(extensions): stop inferring an extension for an extensionless import of a declaration file that has no runtime file with that extension next to it, such as `jsx` for `#types/graphql` resolving to `types/graphql.d.ts`.
