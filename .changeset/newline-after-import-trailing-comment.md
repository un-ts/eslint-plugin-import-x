---
"eslint-plugin-import-x": patch
---

fix(newline-after-import): treat a comment on the import's own line as part of the import

With `considerComments`, a trailing comment such as `import a from 'a' // why`
was taken as the comment after the import, so the rule reported even with an
empty line before the next statement. The autofix also inserted the new lines
between the import and its trailing comment, moving the comment onto its own
line. Both now skip comments that start on the statement's last line.
