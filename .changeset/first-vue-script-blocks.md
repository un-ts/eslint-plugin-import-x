---
"eslint-plugin-import-x": patch
---

fix(first): check the `<script>` and `<script setup>` blocks of a Vue SFC separately, so imports at the top of each block are no longer reported and the fixer no longer moves imports from one block to the other
