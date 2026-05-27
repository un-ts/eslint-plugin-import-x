---
"eslint-plugin-import-x": patch
---

Make the `extensions` rule check Node.js subpath imports (specifiers starting with `#`, e.g. `#utils/helper`). Previously `parsePath` treated a leading `#` as a URL hash fragment, so the rule skipped extension validation for these imports.

Note: single-segment subpath imports without a slash (e.g. `#dep`) are still skipped by the existing external-root-module classification; fixing that is deferred to avoid expanding scope.
