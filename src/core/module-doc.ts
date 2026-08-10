import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import type * as commentParser from 'comment-parser'

import { cjsRequire } from '../require.js'
import type { PluginSettings, DocStyle } from '../types.js'
import { lazy } from '../utils/lazy-value.js'

import type { ModuleInfo } from './module-info.js'
import { lookupExport } from './resolve-exports.js'

/**
 * Doc-comment queries of an analyzed module — needed only by
 * `no-deprecated`. These queries are deprecation-scoped and fast-pathed: a
 * module whose source never mentions a deprecation marker cannot have a
 * deprecated export, so both queries return `undefined` without any parsing
 * (the marker is checked against the raw content at analysis time). Only a
 * module that carries a marker AND declares the queried name escalates to
 * the AST route — re-export chains are walked on already-extracted data.
 */

/**
 * One tag of a doc comment block (e.g. `@deprecated please use x instead`).
 * Declared structurally so consumers do not depend on `comment-parser`;
 * whatever the analysis captures must be assignable to this shape.
 */
export interface DocCommentTag {
  tag: string
  description: string
}

/** A doc comment block attached to a module or to an export declaration. */
export interface DocCommentBlock {
  description: string
  tags: DocCommentTag[]
}

/**
 * The configured docstyles, defaulted. Shared so that the marker fast path and
 * the parser selection can never disagree about which styles are in play — if
 * they did, the fast path would suppress docs the parsers could have read.
 */
function getDocStyles(settings: PluginSettings) {
  return settings['import-x/docstyle'] || DEFAULT_DOC_STYLES
}

const DEFAULT_DOC_STYLES = ['jsdoc'] as const

/**
 * @internal Whether the raw module content mentions a deprecation marker of
 *   any configured docstyle — the short-circuit that makes doc queries free
 *   for the overwhelming majority of modules.
 */
export function hasDeprecationMarker(
  content: string,
  settings: PluginSettings,
): boolean {
  for (const style of getDocStyles(settings)) {
    if (
      style === 'jsdoc'
        ? content.includes('@deprecated')
        : content.includes('Deprecated:')
    ) {
      return true
    }
  }
  return false
}

/**
 * The module-level doc comment block (a block comment carrying an `@module`
 * tag). Deprecation-scoped: `undefined` when the module carries no
 * deprecation marker, even if an `@module` block exists.
 */
export function getModuleDoc(
  moduleInfo: ModuleInfo,
): DocCommentBlock | undefined {
  if (!moduleInfo.maybeHasDeprecationDoc) {
    return
  }
  return moduleInfo.astAnalysis()?.moduleDocGetter?.()
}

/**
 * The doc comment block attached to the declaration of exported `name`.
 * Follows re-export chains exactly like `ModuleInfo#getExport` — the doc of
 * a re-exported name is the doc at its declaration site. Deprecation-scoped,
 * like {@link getModuleDoc}.
 */
export function getExportDoc(
  moduleInfo: ModuleInfo,
  name: string,
): DocCommentBlock | undefined {
  const found = lookupExport(moduleInfo, name)
  if (found == null || !found.declaring.maybeHasDeprecationDoc) {
    return
  }
  return found.declaring.astAnalysis()?.ownExports.get(found.local)?.getDoc?.()
}

type DocStyleParser = (
  comments: TSESTree.Comment[],
) => DocCommentBlock | undefined

// https://github.com/syavorsky/comment-parser/issues/172
const fixup = new Set(['deprecated', 'module'])

let parseComment_: typeof commentParser.parse | undefined

export const parseComment = (comment: string): commentParser.Block => {
  parseComment_ ??= cjsRequire<typeof commentParser>('comment-parser').parse
  const restored = `/**${comment.split(/\r?\n/).reduce((acc, line) => {
    line = line.trim()
    return line && line !== '*' ? acc + '\n  ' + line : acc
  }, '')}
  */`
  const [doc] = parseComment_(restored)
  return {
    ...doc,
    tags: doc.tags.map(t =>
      t.name && fixup.has(t.tag)
        ? { ...t, description: `${t.name} ${t.description}` }
        : t,
    ),
  }
}

/** Parse JSDoc from leading comments */
function captureJsDoc(comments: TSESTree.Comment[]) {
  for (let i = comments.length - 1; i >= 0; i--) {
    const comment = comments[i]
    // skip non-block comments
    if (comment.type !== 'Block') {
      continue
    }
    try {
      return parseComment(comment.value)
    } catch {
      /* don't care, for now? maybe add to `errors?` */
    }
  }
}

/** Parse TomDoc section from comments */
function captureTomDoc(
  comments: TSESTree.Comment[],
): DocCommentBlock | undefined {
  // collect lines up to first paragraph break
  const lines = []
  for (const comment of comments) {
    if (/^\s*$/.test(comment.value)) {
      break
    }
    lines.push(comment.value.trim())
  }

  const statusMatch = lines
    .join(' ')
    .match(/^(Public|Internal|Deprecated):\s*(.+)/)
  if (statusMatch) {
    return {
      description: statusMatch[2],
      tags: [
        {
          tag: statusMatch[1].toLowerCase(),
          description: statusMatch[2],
        },
      ],
    }
  }
}

const availableDocStyleParsers: Record<DocStyle, DocStyleParser> = {
  jsdoc: captureJsDoc,
  tomdoc: captureTomDoc,
}

/** The parsers for the configured `import-x/docstyle`, in order. */
function selectDocStyleParsers(settings: PluginSettings): DocStyleParser[] {
  return getDocStyles(settings).map(style => availableDocStyleParsers[style])
}

/**
 * Create a lazy doc-comment getter from the first node that has leading
 * comments (memoized — the comments are parsed at most once).
 */
export function captureDoc(
  getSource: () => TSESLint.SourceCode,
  settings: PluginSettings,
  ...nodes: Array<TSESTree.Node | undefined>
): () => DocCommentBlock | undefined {
  return lazy(() => {
    const docStyleParsers = selectDocStyleParsers(settings)
    for (const n of nodes) {
      if (!n) {
        continue
      }

      try {
        let leadingComments: TSESTree.Comment[] | undefined

        // n.leadingComments is legacy `attachComments` behavior
        if ('leadingComments' in n && Array.isArray(n.leadingComments)) {
          leadingComments = n.leadingComments as TSESTree.Comment[]
        } else if (n.range) {
          leadingComments = getSource().getCommentsBefore(n)
        }

        if (!leadingComments || leadingComments.length === 0) {
          continue
        }

        for (const parser of docStyleParsers) {
          const doc = parser(leadingComments)
          if (doc) {
            return doc
          }
        }

        return
      } catch {
        continue
      }
    }
  })
}
