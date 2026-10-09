---
"eslint-plugin-import-x": patch
---

fix(order): make the alphabetize comparator transitive, so parent imports now consistently sort before sibling imports in the same group (matching `eslint-plugin-import`) and results no longer depend on the Node version
