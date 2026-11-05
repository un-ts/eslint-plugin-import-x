---
"eslint-plugin-import-x": patch
---

fix(core): keep the size of `settings` out of module and resolver cache keys

Every key held the full `stableHash` text of `settings`, `parserOptions` and the parser. One large value in shared `settings`, like a custom alphabet from `eslint-plugin-perfectionist`, was copied into each key on every resolve, so `no-cycle` and any other rule that resolves imports could run out of memory. Keys now hold a short id per distinct hash.
