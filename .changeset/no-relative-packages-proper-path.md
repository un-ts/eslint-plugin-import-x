---
"eslint-plugin-import-x": patch
---

fix(no-relative-packages): keep the imported path when suggesting the package import

The suggested package import was built from the directory of the resolved file plus the last segment of the import path. An extensionless import of a file named like its package directory (`../bar/src/bar`) became `bar/src`, which resolves to another module, and a directory import (`../bar/src`) became `bar/src/src`. The suffix is now taken from the resolved file below the package root: explicit import extensions are preserved, extensionless imports omit the resolved extension, directory index files collapse back to the directory, and `.d.ts` targets drop the `.d` marker. The autofix is only offered when the suggested package path resolves back to the original module; otherwise the rule reports without suggesting that path. Packages reached through symlinks (pnpm, workspaces) therefore keep their package name and path.
