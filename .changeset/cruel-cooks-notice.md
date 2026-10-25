---
"eslint-plugin-import-x": patch
---

Allow packages to import themselves in `import-x/no-extraneous-dependencies` when the `exports` field is defined in `package.json`; importing a package's own name without `exports` is reported by the new `selfImport` message.
