---
"eslint-plugin-import-x": patch
---

perf(core): memoize `getExportKind` per module and name

Rules ask for an export kind once per imported specifier and once per
namespace member access. Without a memo, every lookup re-walks all `export *`
paths and re-resolves each target; on a 100-star barrel, 2,000 namespace
member accesses took ~5.7 s instead of ~0.1 s. Answers are cached per
`(module, name, typeOnly)`, so the type-only and value answers stay
independent.
