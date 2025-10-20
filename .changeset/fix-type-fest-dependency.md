---
"eslint-plugin-import-x": patch
---

fix(deps): move type-fest from devDependencies to dependencies

Type-fest types are imported in published declaration files (eslint-import-context/lib/types.d.ts and lib/rules/no-extraneous-dependencies.d.ts), which causes TypeScript compilation errors for consumers who don't have skipLibCheck enabled. Moving type-fest to dependencies ensures the types are available to all consumers.
