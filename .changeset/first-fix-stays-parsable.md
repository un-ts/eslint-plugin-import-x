---
"eslint-plugin-import-x": patch
---

fix(first): the autofix puts imports above the decorators of `@dec() export class` and on their own line when they have no semicolon, it could leave code that doesn't parse in both cases
