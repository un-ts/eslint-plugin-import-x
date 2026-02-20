---
"eslint-plugin-import-x": patch
---

First step toward ESLint 10 support:

- `sourceType` determination now prefers `context.languageOptions` when possible
- Ensure `context.parserOptions` no longer results in crashes with ESLint 10
- Merge `getParser` and `getParserPath` implementations into one `getParserOrPath`
