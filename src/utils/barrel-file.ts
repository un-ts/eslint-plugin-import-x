import fs from 'node:fs'

import type { TSESTree } from '@typescript-eslint/utils'

import type { ChildContext, RuleContext } from '../types.js'

import { makeContextCacheKey } from './child-context.js'
import { parse } from './parse.js'

/**
 * Exports and declarations counted over a module's top-level statements.
 *
 * A module that exports more names than it declares is passing through
 * bindings it did not create — the shape of a barrel file. Kept as a plain
 * data pair so `avoid-barrel-files` (which counts the file being linted) and
 * `avoid-importing-barrel-files` (which counts resolved dependencies) cannot
 * drift apart.
 */
export interface ModuleSurface {
  /** Number of names exported at the module's top level. */
  exports: number
  /** Number of declarations in the module's own top-level code. */
  declarations: number
}

/**
 * Counts a single declaration both as a declaration and as the exports it
 * introduces (`export const a = 1, b = 2` declares and exports two names).
 *
 * Takes the closed union an `export` declaration can be. Everything that is
 * not a variable statement or an import-equals alias introduces exactly one
 * exported declaration.
 */
function countDeclaration(
  declaration: TSESTree.NamedExportDeclarations,
): ModuleSurface {
  if (declaration.type === 'VariableDeclaration') {
    return {
      exports: declaration.declarations.length,
      declarations: declaration.declarations.length,
    }
  }

  if (declaration.type === 'TSImportEqualsDeclaration') {
    // `export import Foo = require('foo')` re-exports another module's
    // binding — an export, but no declaration of this module's own
    return { exports: 1, declarations: 0 }
  }

  return { exports: 1, declarations: 1 }
}

/**
 * Counts the exports and own top-level declarations of a parsed module. The
 * AST is whatever the configured parser produced, so TypeScript declarations
 * count too.
 */
export function countModuleSurface(
  body: TSESTree.Program['body'],
): ModuleSurface {
  let exports = 0
  let declarations = 0

  for (const statement of body) {
    switch (statement.type) {
      case 'VariableDeclaration':
      case 'FunctionDeclaration':
      case 'TSDeclareFunction':
      case 'ClassDeclaration':
      case 'TSEnumDeclaration':
      case 'TSModuleDeclaration':
      case 'TSTypeAliasDeclaration':
      case 'TSInterfaceDeclaration': {
        declarations += countDeclaration(statement).declarations
        break
      }
      case 'ExportNamedDeclaration': {
        // `export type { ... }` is erased wholesale, and mixed
        // `export { type A, B }` keeps only the value specifiers — neither
        // contributes to the runtime module graph. Type declarations still
        // count as declarations, so a module of type exports never looks like
        // a barrel.
        const typeOnly = statement.exportKind === 'type'
        if (statement.declaration) {
          const surface = countDeclaration(statement.declaration)
          declarations += surface.declarations
          if (!typeOnly) {
            exports += surface.exports
          }
        }
        if (!typeOnly) {
          for (const specifier of statement.specifiers) {
            if ('exportKind' in specifier && specifier.exportKind === 'type') {
              continue
            }
            exports += 1
          }
        }
        break
      }
      case 'ExportAllDeclaration': {
        if (statement.exportKind !== 'type') {
          exports += 1
        }
        break
      }
      case 'TSExportAssignment': {
        // `export = x` re-exports another module wholesale (CommonJS/TS)
        exports += 1
        break
      }
      case 'ExportDefaultDeclaration': {
        const declaration = statement.declaration
        switch (declaration.type) {
          case 'FunctionDeclaration':
          case 'ClassDeclaration': {
            // a named default export is both a declaration and the export
            exports += 1
            declarations += 1

            break
          }
          case 'CallExpression': {
            // HOC-wrapped definitions are treated as declarations, not exports
            declarations += 1

            break
          }
          case 'ObjectExpression': {
            exports += declaration.properties.length

            break
          }
          default: {
            exports += 1
          }
        }
        break
      }
    }
  }

  return { exports, declarations }
}

/** Whether a module's surface makes it a barrel file at `amount` exports. */
export function isBarrelFileSurface(
  surface: ModuleSurface,
  amount: number,
): boolean {
  return surface.exports > surface.declarations && surface.exports > amount
}

interface SurfaceCacheEntry {
  mtime: number
  surface: ModuleSurface | null
}

/**
 * Surfaces of already-analyzed files, keyed by the settings/parser context and
 * absolute path and invalidated by mtime — the same contract `ModuleInfo` uses.
 * A dependency that changes (a package reinstalled, a file edited in an IDE) is
 * re-read instead of serving a stale answer for the life of the process, and a
 * file that one parser cannot read is not assumed unreadable by another.
 */
const surfaceCache = new Map<string, SurfaceCacheEntry>()

/**
 * The context's settings/parser signature, memoized per context object so the
 * (comparatively expensive) hash is computed once per file rather than once per
 * resolved dependency.
 */
const contextKeys = new WeakMap<RuleContext | ChildContext, string>()

function surfaceCacheKey(
  context: RuleContext | ChildContext,
  path: string,
): string {
  let contextKey = contextKeys.get(context)
  if (contextKey === undefined) {
    contextKey = makeContextCacheKey(context)
    contextKeys.set(context, contextKey)
  }
  return contextKey + '\0' + path
}

/**
 * Analyzes a module on disk and returns its {@link ModuleSurface}, or `null`
 * when the file can't be read or parsed (a binary, a syntax the configured
 * parser rejects, an extension it doesn't handle). Failures are cached against
 * the file's mtime, so a broken file is not re-parsed on every import.
 */
export function getModuleSurface(
  path: string,
  context: RuleContext | ChildContext,
): ModuleSurface | null {
  let mtime: number
  try {
    mtime = fs.statSync(path).mtimeMs
  } catch {
    return null
  }

  const key = surfaceCacheKey(context, path)
  const cached = surfaceCache.get(key)
  if (cached && cached.mtime === mtime) {
    return cached.surface
  }

  let surface: ModuleSurface | null = null
  try {
    const content = fs.readFileSync(path, 'utf8')
    const { ast } = parse(path, content, context, false)
    surface = countModuleSurface(ast.body)
  } catch {
    surface = null
  }

  surfaceCache.set(key, { mtime, surface })
  return surface
}
