---
"eslint-plugin-import-x": patch
---

fix(order): make the alphabetize comparator transitive, so sibling imports now consistently sort before parent imports in the same group and results no longer depend on the Node version
