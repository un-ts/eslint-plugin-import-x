import type { TSESTree } from '@typescript-eslint/utils'
import * as cjsModuleLexer from 'cjs-module-lexer'
import * as esModuleLexer from 'es-module-lexer'

/**
 * Lexer-based analysis of plain JavaScript modules, third-party or
 * project-internal — the fast path that avoids running a full ESLint parser.
 * Pure lexing only: this module knows nothing about `ModuleInfo`.
 *
 * Correctness rule for everything here: es-module-lexer is permissive, and
 * syntax it accepts but reads differently than a real parser would must send
 * the file back to the AST route via a `null` return, never produce a
 * best-effort answer. See `TYPE_MODIFIER_PATTERN`,
 * `NON_STANDARD_EXPORT_FROM_PATTERN` and `LINE_SEPARATOR_PATTERN` for the cases
 * that need detecting; anything the lexer outright rejects (JSX) falls back on
 * its own.
 *
 * Callers must pass BOM-free content — `ModuleInfo.for` strips it, matching what
 * `parse` and ESLint itself do, so that offsets from both routes agree.
 *
 * ESLint rules are synchronous, so both lexers are initialized with their
 * Node.js-specific `initSync()` (synchronous WebAssembly compilation).
 */

/** An `import`/`export ... from`/`import()` edge found by the lexer. */
export interface LexedImport {
  specifier: string
  /** Location of the specifier string literal (quotes included). */
  loc: TSESTree.SourceLocation
  dynamic: boolean
  /** The edge comes from a plain `export * from '...'` statement. */
  starReexport: boolean
}

/** One `export { local as exported } from '...'`. */
export interface LexedReexport {
  exported: string
  local: string
  specifier: string
}

/**
 * An own export that is a namespace object: `export * as ns from '...'`, or a
 * re-exported `import * as ns` binding (`export { ns }`, `export default ns`).
 */
export interface LexedNamespaceExport {
  exported: string
  specifier: string
}

/** The name a module's default export is declared under, in that module. */
export interface DefaultExportSourceName {
  name: string
  /**
   * `true` when the name comes from a renamable binding (an identifier
   * reference or an assignment) rather than a declaration (class/function
   * declaration or an explicit `export { x as default }` specifier).
   */
  isBoundName: boolean
}

export interface LexedEsModule {
  /**
   * `'module'` — has import/export declarations; `'ambiguous'` — only
   * dynamic `import()` was found (same distinction the AST path draws).
   */
  format: 'module' | 'ambiguous'
  /** Names exported by the module's own code (including `default`). */
  ownExports: string[]
  reexports: LexedReexport[]
  namespaceExports: LexedNamespaceExport[]
  imports: LexedImport[]
  /**
   * Derived without a parser and definitive for lexable JavaScript:
   * `undefined` means the module has no (nameable) default export, matching
   * what the AST route would answer — do not escalate. Known fail-open
   * corners (both yield `undefined` where the AST finds a name):
   * assignments as call arguments (`withHoc(Foo = 1)`) and ASI-continued
   * default expressions.
   */
  defaultExportSourceName?: DefaultExportSourceName
}

/**
 * A script with no ES module syntax at all — CommonJS territory. The
 * cjs-module-lexer output is carried along for future use (Node uses it for
 * ESM→CJS named-export interop), but rules currently treat CJS modules as
 * unanalyzable, matching the AST path.
 */
export interface LexedScript {
  format: 'script'
  exports: string[]
  reexports: string[]
}

export type LexedModule = LexedEsModule | LexedScript

/** Extensions the lexers can handle — plain JavaScript only. */
export const LEXABLE_EXTENSIONS_PATTERN = /\.[cm]?js$/

let lexersReady: boolean | undefined

function ensureLexersInitialized(): boolean {
  if (lexersReady === undefined) {
    try {
      esModuleLexer.initSync()
      cjsModuleLexer.initSync()
      lexersReady = true
    } catch {
      lexersReady = false
    }
  }
  return lexersReady
}

const BLOCK_COMMENT_PATTERN = /\/\*[\s\S]*?\*\//g
const LINE_COMMENT_PATTERN = /\/\/.*$/gm
const EXPORT_STAR_AS_PATTERN = /^export\s*\*\s*as\s/
const EXPORT_STAR_PATTERN = /^export\s*\*/
const REEXPORT_ENTRY_PATTERN = /^(?:([\w$]+)\s+as\s+)?([\w$]+)$/

function stripComments(statement: string) {
  return statement
    .replaceAll(BLOCK_COMMENT_PATTERN, ' ')
    .replaceAll(LINE_COMMENT_PATTERN, ' ')
    .trimStart()
}

/**
 * Comment-stripped text of a statement up to (not including) the opening quote
 * of its specifier — i.e. the whole import/export clause, which is all any
 * caller here inspects. Memoized by statement start offset: three passes want
 * the same slices, and stripping allocates two intermediate strings each time.
 *
 * Cutting at the specifier offset rather than searching for `from` matters:
 * `import * as ns from './from'` would otherwise be split on the wrong token.
 */
function createClauseReader(content: string) {
  const cache = new Map<number, string>()
  return (imp: esModuleLexer.ImportSpecifier) => {
    let clause = cache.get(imp.ss)
    if (clause === undefined) {
      clause = stripComments(content.slice(imp.ss, Math.max(imp.ss, imp.s - 1)))
      cache.set(imp.ss, clause)
    }
    return clause
  }
}

/**
 * A `type`/`typeof` modifier in an import clause. es-module-lexer happily
 * accepts Flow's `import type { T } from '...'`, `import typeof T from '...'`
 * and TS's inline `import { type T, v }` — but those bind nothing at runtime,
 * so treating them as value imports would report edges that do not exist. A
 * file using them is not the plain JavaScript this route assumes and belongs
 * to the AST parser.
 *
 * Deliberately broad: a binding merely *named* `type` (`import { type as t }`)
 * also falls back, which costs a parse but is never wrong. Under-matching
 * here would produce false reports, so the bias is intentional.
 */
const TYPE_MODIFIER_PATTERN = /\b(?:type|typeof)\b/

/** The `ns` of `import * as ns from '...'` / `import d, * as ns from '...'`. */
const NAMESPACE_CLAUSE_PATTERN = /\*\s*as\s+([A-Za-z_$][\w$]*)/

/**
 * `export default from './x'` / `export baz from './x'` — the stage-1
 * export-extensions proposal that `@babel/eslint-parser` accepts and the AST
 * route models as `ExportDefaultSpecifier`. es-module-lexer does not merely
 * mis-read these: it reports **no import edge at all**, and for the named form
 * no export either, so the module link disappears without a trace. Nothing in
 * the lexer's output can betray them, which is why this has to scan content.
 *
 * Standard export-from syntax never matches — `{` and `*` are not identifiers,
 * and `export default <expr>` has no following `from '`.
 */
const NON_STANDARD_EXPORT_FROM_PATTERN =
  /^\s*export\s+[A-Za-z_$][\w$]*\s+from\s*['"]/m

/**
 * U+2028 LINE SEPARATOR / U+2029 PARAGRAPH SEPARATOR. ECMAScript counts both as
 * line terminators; es-module-lexer does not, and silently **drops every
 * import edge after one** (verified: the second of two imports disappears from
 * its output entirely). Nothing in the result betrays the loss, so the only
 * safe move is to hand the file to the AST parser.
 *
 * Deliberately checked against the whole file rather than just code: these
 * characters are legal inside string literals, so a data-heavy module can fall
 * back needlessly. That costs a parse; guessing which occurrences are code
 * would cost correctness.
 */
const LINE_SEPARATOR_PATTERN = /[\u2028\u2029]/

const EXPORT_DEFAULT_PATTERN = /^export\s+default\s+/
const CALL_HEAD_PATTERN = /^[A-Za-z_$][\w$]*\s*\(\s*/
const PAREN_HEAD_PATTERN = /^\(\s*/
const IDENTIFIER_HEAD_PATTERN = /^[A-Za-z_$][\w$]*/
/**
 * Tokens that continue an expression after an identifier — not a bare name.
 * `=` is included: plain assignment is recognized explicitly beforehand, so
 * a remaining `=` is an arrow (`=>`) or comparison (`==`).
 */
const EXPRESSION_CONTINUATION_PATTERN = /^[.([`+\-*/%<>&|^?,:!~=]/
/**
 * The same thing, for the two binary operators that are *words* rather than
 * punctuation. Without this, `export default Foo instanceof Bar` read as the
 * bare identifier `Foo` and reported it as the default's declared name, while
 * the AST route sees a `BinaryExpression` and correctly finds no name — a
 * `no-rename-default` false positive on valid code. `NON_NAME_KEYWORDS` already
 * lists both, but is only consulted for the identifier itself, never for what
 * follows it.
 */
const KEYWORD_CONTINUATION_PATTERN = /^(?:instanceof|in)\b/
/** Words the identifier pattern matches that can never be a default's name. */
const NON_NAME_KEYWORDS = new Set([
  'async',
  'await',
  'class',
  'delete',
  'do',
  'false',
  'function',
  'if',
  'in',
  'instanceof',
  'new',
  'null',
  'switch',
  'this',
  'true',
  'typeof',
  'void',
  'yield',
] as const)

/**
 * Derive the default export's declared name from the statement text —
 * mirroring the AST route's `resolveDefaultName` for the `ln`-less shapes:
 * a bare identifier, an assignment, or an identifier threaded through call
 * wrappers (`withHoc(Foo)`). Anything else (objects, literals, anonymous
 * functions/classes, arrows) has no name on the AST route either.
 */
function deriveDefaultExportSourceName(
  head: string,
): DefaultExportSourceName | undefined {
  const statement = EXPORT_DEFAULT_PATTERN.exec(head)
  if (!statement) {
    return
  }
  let expression = head.slice(statement[0].length)

  // unwrap call wrappers and parentheses: `withHoc(hoc2(Foo))` → `Foo`
  let insideCall = false
  for (let depth = 0; depth < 8; depth++) {
    const call = CALL_HEAD_PATTERN.exec(expression)
    if (call && !NON_NAME_KEYWORDS.has(call[0].replace(/\s*\(\s*$/, ''))) {
      expression = expression.slice(call[0].length)
      insideCall = true
      continue
    }
    const paren = PAREN_HEAD_PATTERN.exec(expression)
    if (paren) {
      expression = expression.slice(paren[0].length)
      continue
    }
    break
  }

  const identifier = IDENTIFIER_HEAD_PATTERN.exec(expression)
  if (!identifier || NON_NAME_KEYWORDS.has(identifier[0])) {
    return
  }
  const name = identifier[0]
  const rest = expression.slice(name.length).replace(/^\s+/, '')

  if (insideCall) {
    // the identifier must be a plain call argument
    return rest.startsWith(')') || rest.startsWith(',')
      ? { name, isBoundName: true }
      : undefined
  }
  // `export default Foo = 1` (but not `==` comparison or `=>` arrow)
  if (/^=(?![=>])/.test(rest)) {
    return { name, isBoundName: true }
  }
  // a bare identifier: nothing may continue the expression
  return rest === '' ||
    !(
      EXPRESSION_CONTINUATION_PATTERN.test(rest) ||
      KEYWORD_CONTINUATION_PATTERN.test(rest)
    )
    ? { name, isBoundName: true }
    : undefined
}

/**
 * Extract the `exported → local` pairs of a named re-export statement
 * (`export { a, b as c } from '...'`) from its source text — es-module-lexer
 * does not report local names of re-exported bindings.
 */
function parseReexportLocals(statement: string) {
  const locals = new Map<string, string>()
  const open = statement.indexOf('{')
  const close = statement.indexOf('}')
  if (open === -1 || close === -1 || close < open) {
    return locals
  }
  for (const rawEntry of statement.slice(open + 1, close).split(',')) {
    const entry = rawEntry.trim()
    if (!entry) {
      continue
    }
    const match = REEXPORT_ENTRY_PATTERN.exec(entry)
    if (match) {
      const [, local, name] = match
      // `x` → local x, exported x; `x as y` → local x, exported y
      locals.set(name, local ?? name)
    }
  }
  return locals
}

/**
 * Offsets → `{ line, column }`, resolved eagerly by the caller so that
 * nothing downstream keeps `content` alive: a cached `ModuleInfo` must not
 * retain the source text of a bundled dependency (see `needDocs` on
 * `analyzeAstModule` for the same concern on the AST route).
 */
function createOffsetToLoc(content: string) {
  let lineStarts: number[] | undefined

  function position(offset: number): TSESTree.Position {
    if (!lineStarts) {
      lineStarts = [0]
      if (content.includes('\r')) {
        // `\r\n` and lone `\r` both have to be recognized — ECMAScript counts
        // each as one line terminator, and espree agrees. Splitting on `\n`
        // alone put every position after a lone `\r` on the wrong line, which
        // silently broke the loc join in `withLazyImported`.
        // (U+2028/U+2029 cannot reach here; see LINE_SEPARATOR_PATTERN.)
        for (let i = 0; i < content.length; i++) {
          const code = content.codePointAt(i)
          if (code === 13 /* \r */) {
            if (content.codePointAt(i + 1) === 10 /* \n */) {
              i++ // CRLF is a single terminator
            }
            lineStarts.push(i + 1)
          } else if (code === 10 /* \n */) {
            lineStarts.push(i + 1)
          }
        }
      } else {
        // LF only — the overwhelmingly common case. Native search beats a
        // per-character scan: one step per line, not one per byte.
        for (
          let i = content.indexOf('\n');
          i !== -1;
          i = content.indexOf('\n', i + 1)
        ) {
          lineStarts.push(i + 1)
        }
      }
    }
    let low = 0
    let high = lineStarts.length - 1
    while (low < high) {
      const mid = (low + high + 1) >> 1
      if (lineStarts[mid] <= offset) {
        low = mid
      } else {
        high = mid - 1
      }
    }
    return { line: low + 1, column: offset - lineStarts[low] }
  }

  return (start: number, end: number): TSESTree.SourceLocation => ({
    start: position(start),
    end: position(end),
  })
}

/**
 * Lex a JavaScript module.
 *
 * Caveat: es-module-lexer is permissive about some invalid-ESM syntax — e.g.
 * Flow's `import type { x } from '...'` does NOT throw — so uncompiled
 * Flow-typed files may be lexed as ESM with type imports treated as value
 * imports. Rare for published packages, and failures lean open (missed
 * reports, not false ones).
 *
 * @returns The lexed shape, or `null` when the lexers cannot handle the file
 *   (initialization failure or a lexer parse error, e.g. JSX) — the caller
 *   must fall back to the full AST-parse route.
 */
export function lexModule(
  content: string,
  filepath: string,
): LexedModule | null {
  if (!ensureLexersInitialized()) {
    return null
  }

  if (LINE_SEPARATOR_PATTERN.test(content)) {
    return null // edges would vanish — see LINE_SEPARATOR_PATTERN
  }

  let imports: readonly esModuleLexer.ImportSpecifier[]
  let exports: readonly esModuleLexer.ExportSpecifier[]
  let hasModuleSyntax: boolean
  try {
    ;[imports, exports, , hasModuleSyntax] = esModuleLexer.parse(
      content,
      filepath,
    )
  } catch {
    return null
  }

  // Mirror the AST path's module-format decision (`isUnambiguousModule`):
  // import/export *declarations* make a module; a lone `import.meta`
  // (hasModuleSyntax, but no declaration) does not.
  const isModule =
    hasModuleSyntax &&
    (exports.length > 0 ||
      imports.some(i => i.d === -1) ||
      !imports.some(i => i.d === -2))

  if (isModule && NON_STANDARD_EXPORT_FROM_PATTERN.test(content)) {
    return null // see NON_STANDARD_EXPORT_FROM_PATTERN
  }

  if (!isModule) {
    if (imports.some(i => i.d >= 0)) {
      // dynamic `import()` only — same as the AST path's dynamic-import scan:
      // the module stays 'ambiguous' but its dynamic edges are recorded
      return {
        format: 'ambiguous',
        ownExports: [],
        reexports: [],
        namespaceExports: [],
        // no static import declarations can exist here (see `isModule`), so
        // neither statement set can have members
        imports: collectImportEdges(content, imports, new Set(), new Set()),
      }
    }

    // no ES module syntax at all — CommonJS territory
    try {
      const { exports: cjsExports, reexports: cjsReexports } =
        cjsModuleLexer.parse(content, filepath)
      return { format: 'script', exports: cjsExports, reexports: cjsReexports }
    } catch {
      return null
    }
  }

  const readClause = createClauseReader(content)

  const ownExports: string[] = []
  const reexports: LexedReexport[] = []
  const namespaceExports: LexedNamespaceExport[] = []

  /**
   * `import * as ns from '...'` bindings — the AST route's `walk.namespaces`,
   * so that a later `export { ns }` is recognized as a namespace object rather
   * than an opaque own export. Import bindings are module-scoped and neither
   * shadowable nor reassignable, so joining exports to them by name is sound.
   */
  const namespaceBindings = new Map<string, string>()

  // export-from statements, keyed by statement start offset
  const exportFromStatements = new Map<
    number,
    { specifier: string; clause: string; starAs: boolean }
  >()
  const skippedImportEdges = new Set<number>()
  /** Statement offsets of plain `export * from '...'` edges. */
  const starReexportEdges = new Set<number>()

  for (const imp of imports) {
    if (imp.d !== -1 || imp.n == null) {
      continue
    }
    const clause = readClause(imp)
    if (TYPE_MODIFIER_PATTERN.test(clause)) {
      return null // not plain JavaScript — see TYPE_MODIFIER_PATTERN
    }
    if (!clause.startsWith('export')) {
      const namespace = NAMESPACE_CLAUSE_PATTERN.exec(clause)
      if (namespace) {
        namespaceBindings.set(namespace[1], imp.n)
      }
      continue
    }
    const starAs = EXPORT_STAR_AS_PATTERN.test(clause)
    if (starAs) {
      // parity with the AST path: `export * as ns from` gets a lazy
      // namespace, not an import edge
      skippedImportEdges.add(imp.ss)
    } else if (EXPORT_STAR_PATTERN.test(clause)) {
      // classify the edge here, while the clause is in hand — the edge pass
      // would otherwise re-run all three patterns over the same string
      starReexportEdges.add(imp.ss)
    }
    exportFromStatements.set(imp.ss, { specifier: imp.n, clause, starAs })
  }

  let defaultExportSourceName: DefaultExportSourceName | undefined

  for (const exp of exports) {
    const stmt = exportFromStatements.get(exp.ss)
    if (!stmt) {
      let localName = exp.ln
      if (exp.n === 'default') {
        if (exp.ln == null) {
          // an expression default: only the statement text can name it, and
          // a name derived from a bare binding reference is exactly the one to
          // look up below for `export default ns`
          defaultExportSourceName = deriveDefaultExportSourceName(
            stripComments(content.slice(exp.ss, exp.ss + 512)),
          )
          if (defaultExportSourceName?.isBoundName) {
            localName = defaultExportSourceName.name
          }
        } else {
          // es-module-lexer reports the local name for every *declared* form —
          // `export default function foo` / `class Foo` / `export { x as default }`
          // — so no statement text needs slicing or comment-stripping
          defaultExportSourceName = { name: exp.ln, isBoundName: false }
        }
      }
      // `export { ns }` / `export { ns as x }` / `export default ns`, where
      // `ns` is an `import * as ns` binding: an own export that *is* a
      // namespace object, matching the AST route's `namespaceTargetOf`
      const namespaceTarget =
        localName == null ? undefined : namespaceBindings.get(localName)
      if (namespaceTarget === undefined) {
        ownExports.push(exp.n)
      } else {
        namespaceExports.push({ exported: exp.n, specifier: namespaceTarget })
      }
      continue
    }
    if (stmt.starAs) {
      namespaceExports.push({ exported: exp.n, specifier: stmt.specifier })
      continue
    }
    // `export { a, b as c } from '...'` — recover the local name
    const local = exp.ln ?? parseReexportLocals(stmt.clause).get(exp.n)
    if (local == null) {
      // exotic syntax (e.g. string export names): model as an own export so
      // lookups still succeed (fails open, no deep verification)
      ownExports.push(exp.n)
    } else {
      reexports.push({ exported: exp.n, local, specifier: stmt.specifier })
    }
  }

  return {
    format: 'module',
    ownExports,
    reexports,
    namespaceExports,
    imports: collectImportEdges(
      content,
      imports,
      skippedImportEdges,
      starReexportEdges,
    ),
    ...(defaultExportSourceName && { defaultExportSourceName }),
  }
}

function collectImportEdges(
  content: string,
  imports: readonly esModuleLexer.ImportSpecifier[],
  skippedStatements: ReadonlySet<number>,
  starReexportStatements: ReadonlySet<number>,
): LexedImport[] {
  const offsetToLoc = createOffsetToLoc(content)
  const edges: LexedImport[] = []
  for (const imp of imports) {
    // skip `import.meta` (d === -2) and dynamic imports whose specifier is
    // not a plain string (n == null) — matching the AST path
    if (imp.d < -1 || imp.n == null || skippedStatements.has(imp.ss)) {
      continue
    }
    const dynamic = imp.d >= 0
    const starReexport = !dynamic && starReexportStatements.has(imp.ss)
    edges.push({
      specifier: imp.n,
      // Include the quotes, like a string literal AST node's loc. A dynamic
      // import's offsets already cover them (es-module-lexer reports the
      // specifier *expression* there), while a static import's do not —
      // widening both alike would span the `import(...)` parentheses.
      loc: dynamic
        ? offsetToLoc(imp.s, imp.e)
        : offsetToLoc(imp.s - 1, imp.e + 1),
      dynamic,
      starReexport,
    })
  }
  return edges
}
