---
"eslint-plugin-import-x": patch
---

fix(deps): replace type-fest with @package-json/types

PackageJson types are imported in published declaration files (lib/rules/no-extraneous-dependencies.d.ts and lib/utils/read-pkg-up.d.ts), which causes TypeScript compilation errors for consumers who don't have skipLibCheck enabled. Replacing type-fest with the smaller @package-json/types package ensures the types are available to all consumers while reducing bundle size.
