import fs from 'node:fs'

import type { TSESTree } from '@typescript-eslint/utils'

import type { ChildContext, RuleContext } from '../types.js'

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
 */
function countDeclaration(declaration: TSESTree.Node): ModuleSurface {
  switch (declaration.type) {
    case 'VariableDeclaration': {
      return {
        exports: declaration.declarations.length,
        declarations: declaration.declarations.length,
      }
    }
    case 'FunctionDeclaration':
    case 'ClassDeclaration':
    case 'TSTypeAliasDeclaration':
    case 'TSInterfaceDeclaration': {
      return { exports: 1, declarations: 1 }
    }
    default: {
      return { exports: 0, declarations: 0 }
    }
  }
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
      case 'ClassDeclaration':
      case 'TSTypeAliasDeclaration':
      case 'TSInterfaceDeclaration': {
        declarations += countDeclaration(statement).declarations
        break
      }
      case 'ExportNamedDeclaration': {
        if (statement.declaration) {
          const surface = countDeclaration(statement.declaration)
          exports += surface.exports
          declarations += surface.declarations
        }
        // re-exports and `export { local as exported }` bindings
        exports += statement.specifiers.length
        break
      }
      case 'ExportAllDeclaration': {
        if (statement.exportKind !== 'type') {
          exports += 1
        }
        break
      }
      case 'ExportDefaultDeclaration': {
        const declaration = statement.declaration
        if (
          declaration.type === 'FunctionDeclaration' ||
          declaration.type === 'ClassDeclaration' ||
          declaration.type === 'CallExpression'
        ) {
          declarations += 1
        } else if (declaration.type === 'ObjectExpression') {
          exports += declaration.properties.length
        } else {
          exports += 1
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
 * Surfaces of already-analyzed files, keyed by absolute path and invalidated
 * by mtime — the same contract `ModuleInfo` uses, so a dependency that changes
 * (a package reinstalled, a file edited in an IDE) is re-read instead of
 * serving a stale answer for the life of the process.
 */
const surfaceCache = new Map<string, SurfaceCacheEntry>()

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

  const cached = surfaceCache.get(path)
  if (cached && cached.mtime === mtime) {
    return cached.surface
  }

  let surface: ModuleSurface | null = null
  try {
    const content = fs.readFileSync(path, 'utf8')
    const { ast } = parse(path, content, context, false)
    surface = ast == null ? null : countModuleSurface(ast.body)
  } catch {
    surface = null
  }

  surfaceCache.set(path, { mtime, surface })
  return surface
}
