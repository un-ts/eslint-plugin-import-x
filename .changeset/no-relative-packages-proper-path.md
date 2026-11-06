---
"eslint-plugin-import-x": patch
---

fix(no-relative-packages): keep the imported path when suggesting the package import

The suggested package import was built from the directory of the resolved file plus the last segment of the import path. An extensionless import of a file named like its package directory (`../bar/src/bar`) became `bar/src`, which resolves to another module, and a directory import (`../bar/src`) became `bar/src/src`. The path below the package root is now taken from the import itself when that path still points into the resolved package; otherwise it is taken from the resolved file, preserving the import's explicit extension (for example `.js` when the resolver maps it to a `.ts` file) and omitting the resolved extension for extensionless imports. Packages reached through symlinks (pnpm, workspaces) therefore keep their package name and path. In the resolved-file fallback, the autofix is omitted when the suggested package path resolves to a different module, and declaration-file targets drop the `.d` marker before applying the requested extension.
