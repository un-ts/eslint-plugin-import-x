---
"eslint-plugin-import-x": patch
---

Drastically improve `no-cycle`'s performance by skipping unnecessary BFSes using [Tarjan's SCC](https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm).
