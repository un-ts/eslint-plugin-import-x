import type { TSESTree } from '@typescript-eslint/utils'

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

/** A top-level statement, as the configured parser produced it. */
type Statement = TSESTree.Program['body'][number]

/** Statement kinds that declare exactly one binding when not exported. */
const SINGLE_DECLARATION_TYPES = new Set<string>([
  'FunctionDeclaration',
  'TSDeclareFunction',
  'ClassDeclaration',
  'TSEnumDeclaration',
  'TSModuleDeclaration',
  'TSTypeAliasDeclaration',
  'TSInterfaceDeclaration',
])

/** Declarations a bare (non-exported) top-level statement introduces. */
function countOwnDeclaration(statement: Statement): number {
  if (statement.type === 'VariableDeclaration') {
    return statement.declarations.length
  }
  return SINGLE_DECLARATION_TYPES.has(statement.type) ? 1 : 0
}

/**
 * `export { … }` / `export const …`: the inline declaration, if any, plus every
 * value specifier. `export type { … }` is erased wholesale and mixed
 * `export { type A, B }` keeps only the value specifiers — neither contributes
 * to the runtime module graph. Type declarations still count as declarations,
 * so a module of type exports never looks like a barrel.
 */
function countNamedExport(
  statement: TSESTree.ExportNamedDeclaration,
): ModuleSurface {
  const typeOnly = statement.exportKind === 'type'
  let exports = 0
  let declarations = 0

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

  return { exports, declarations }
}

/** `export default …`: a declaration, an object literal, or an expression. */
function countDefaultExport(
  declaration: TSESTree.ExportDefaultDeclaration['declaration'],
): ModuleSurface {
  switch (declaration.type) {
    case 'FunctionDeclaration':
    case 'ClassDeclaration': {
      // a named default export is both a declaration and the export
      return { exports: 1, declarations: 1 }
    }
    case 'CallExpression': {
      // HOC-wrapped definitions are treated as declarations, not exports
      return { exports: 0, declarations: 1 }
    }
    case 'ObjectExpression': {
      // the object's properties become the module's named exports
      return { exports: declaration.properties.length, declarations: 0 }
    }
    default: {
      return { exports: 1, declarations: 0 }
    }
  }
}

/** Exports and declarations a single top-level statement contributes. */
function countStatement(statement: Statement): ModuleSurface {
  switch (statement.type) {
    case 'ExportNamedDeclaration': {
      return countNamedExport(statement)
    }
    case 'ExportAllDeclaration': {
      return {
        exports: statement.exportKind === 'type' ? 0 : 1,
        declarations: 0,
      }
    }
    case 'TSExportAssignment': {
      // `export = x` re-exports another module wholesale (CommonJS/TS)
      return { exports: 1, declarations: 0 }
    }
    case 'ExportDefaultDeclaration': {
      return countDefaultExport(statement.declaration)
    }
    default: {
      return { exports: 0, declarations: countOwnDeclaration(statement) }
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
    const surface = countStatement(statement)
    exports += surface.exports
    declarations += surface.declarations
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
