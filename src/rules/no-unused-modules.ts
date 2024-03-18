/**
 * Ensures that modules contain exports and/or all
 * modules are consumed within other modules.
 */

import path from 'node:path'

import { TSESTree } from '@typescript-eslint/utils'

import type { FileExtension, RuleContext } from '../types'
import {
  ExportMap,
  recursivePatternCapture,
  createRule,
  resolve,
  getFileExtensions,
  readPkgUp,
  visit,
} from '../utils'

function listFilesToProcess(src: string[], extensions: FileExtension[]) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let FileEnumerator: typeof import('eslint/use-at-your-own-risk').FileEnumerator

  try {
    ;({ FileEnumerator } = require('eslint/use-at-your-own-risk'))
  } catch {
    ;({ FileEnumerator } = require('eslint/lib/cli-engine/file-enumerator'))
  }

  const enumerator = new FileEnumerator({
    extensions,
  })

  return Array.from(enumerator.iterateFiles(src), ({ filePath, ignored }) => ({
    ignored,
    filename: filePath,
  }))
}

const DEFAULT = 'default'

const { AST_NODE_TYPES } = TSESTree

function forEachDeclarationIdentifier(
  declaration: TSESTree.Node | null,
  cb: (name: string) => void,
) {
  if (declaration) {
    if (
      declaration.type === AST_NODE_TYPES.FunctionDeclaration ||
      declaration.type === AST_NODE_TYPES.ClassDeclaration ||
      declaration.type === AST_NODE_TYPES.TSInterfaceDeclaration ||
      declaration.type === AST_NODE_TYPES.TSTypeAliasDeclaration ||
      declaration.type === AST_NODE_TYPES.TSEnumDeclaration
    ) {
      cb(declaration.id!.name)
    } else if (declaration.type === AST_NODE_TYPES.VariableDeclaration) {
      for (const { id } of declaration.declarations) {
        if (id.type === AST_NODE_TYPES.ObjectPattern) {
          recursivePatternCapture(id, pattern => {
            if (pattern.type === AST_NODE_TYPES.Identifier) {
              cb(pattern.name)
            }
          })
        } else if (id.type === AST_NODE_TYPES.ArrayPattern) {
          for (const el of id.elements) {
            if (el?.type === AST_NODE_TYPES.Identifier) {
              cb(el.name)
            }
          }
        } else {
          cb(id.name)
        }
      }
    }
  }
}

/**
 * List of imports per file.
 *
 * Represented by a two-level Map to a Set of identifiers. The upper-level Map
 * keys are the paths to the modules containing the imports, while the
 * lower-level Map keys are the paths to the files which are being imported
 * from. Lastly, the Set of identifiers contains either names being imported
 * or a special AST node name listed above (e.g ImportDefaultSpecifier).
 *
 * For example, if we have a file named foo.js containing:
 *
 *   import { o2 } from './bar.js';
 *
 * Then we will have a structure that looks like:
 *
 *   Map { 'foo.js' => Map { 'bar.js' => Set { 'o2' } } }
 *
 */
const importList = new Map<string, Map<string, Set<string>>>()

/**
 * List of exports per file.
 *
 * Represented by a two-level Map to an object of metadata. The upper-level Map
 * keys are the paths to the modules containing the exports, while the
 * lower-level Map keys are the specific identifiers or special AST node names
 * being exported. The leaf-level metadata object at the moment only contains a
 * `whereUsed` property, which contains a Set of paths to modules that import
 * the name.
 *
 * For example, if we have a file named bar.js containing the following exports:
 *
 *   const o2 = 'bar';
 *   export { o2 };
 *
 * And a file named foo.js containing the following import:
 *
 *   import { o2 } from './bar.js';
 *
 * Then we will have a structure that looks like:
 *
 *   Map { 'bar.js' => Map { 'o2' => { whereUsed: Set { 'foo.js' } } } }
 */
const exportList = new Map<string, Map<string, { whereUsed: Set<string> }>>()

const visitorKeyMap = new Map()

const ignoredFiles = new Set()
const filesOutsideSrc = new Set()

const isNodeModule = (path: string) => /([/\\])(node_modules)\1/.test(path)

/**
 * read all files matching the patterns in src and ignoreExports
 *
 * return all files matching src pattern, which are not matching the ignoreExports pattern
 */
const resolveFiles = (
  src: string[],
  ignoreExports: string[],
  context: RuleContext,
) => {
  const extensions = [...getFileExtensions(context.settings)]

  const srcFileList = listFilesToProcess(src, extensions)

  // prepare list of ignored files
  const ignoredFilesList = listFilesToProcess(ignoreExports, extensions)
  for (const { filename } of ignoredFilesList) ignoredFiles.add(filename)

  // prepare list of source files, don't consider files from node_modules

  return new Set(
    srcFileList.flatMap(({ filename }) =>
      isNodeModule(filename) ? [] : filename,
    ),
  )
}

/**
 * parse all source files and build up 2 maps containing the existing imports and exports
 */
const prepareImportsAndExports = (
  srcFiles: Set<string>,
  context: RuleContext,
) => {
  const exportAll = new Map<string, Set<string>>()
  for (const file of srcFiles) {
    const exports = new Map<string, { whereUsed: Set<string> }>()
    const imports = new Map<string, Set<string>>()
    const currentExports = ExportMap.get(file, context)
    if (currentExports) {
      const {
        dependencies,
        reexports,
        imports: localImportList,
        namespace,
        visitorKeys,
      } = currentExports

      visitorKeyMap.set(file, visitorKeys)
      // dependencies === export * from
      const currentExportAll = new Set<string>()
      for (const getDependency of dependencies) {
        const dependency = getDependency()
        if (dependency === null) {
          continue
        }

        currentExportAll.add(dependency.path)
      }
      exportAll.set(file, currentExportAll)

      for (const [key, value] of reexports.entries()) {
        if (key === DEFAULT) {
          exports.set(AST_NODE_TYPES.ImportDefaultSpecifier, {
            whereUsed: new Set(),
          })
        } else {
          exports.set(key, { whereUsed: new Set() })
        }
        const reexport = value.getImport()
        if (!reexport) {
          continue
        }
        let localImport = imports.get(reexport.path)
        const currentValue =
          value.local === DEFAULT
            ? AST_NODE_TYPES.ImportDefaultSpecifier
            : value.local
        localImport =
          localImport === undefined
            ? new Set([currentValue])
            : new Set([...localImport, currentValue])
        imports.set(reexport.path, localImport)
      }

      for (const [key, value] of localImportList.entries()) {
        if (isNodeModule(key)) {
          continue
        }
        const localImport = imports.get(key) || new Set()
        for (const { importedSpecifiers } of value.declarations) {
          for (const specifier of importedSpecifiers!) {
            localImport.add(specifier)
          }
        }
        imports.set(key, localImport)
      }
      importList.set(file, imports)

      // build up export list only, if file is not ignored
      if (ignoredFiles.has(file)) {
        continue
      }
      for (const [key, _value] of namespace.entries()) {
        if (key === DEFAULT) {
          exports.set(AST_NODE_TYPES.ImportDefaultSpecifier, {
            whereUsed: new Set(),
          })
        } else {
          exports.set(key, { whereUsed: new Set() })
        }
      }
    }
    exports.set(AST_NODE_TYPES.ExportAllDeclaration, {
      whereUsed: new Set(),
    })
    exports.set(AST_NODE_TYPES.ImportNamespaceSpecifier, {
      whereUsed: new Set(),
    })
    exportList.set(file, exports)
  }
  for (const [key, value] of exportAll.entries()) {
    for (const val of value) {
      const currentExports = exportList.get(val)
      if (currentExports) {
        const currentExport = currentExports.get(
          AST_NODE_TYPES.ExportAllDeclaration,
        )
        currentExport!.whereUsed.add(key)
      }
    }
  }
}

/**
 * traverse through all imports and add the respective path to the whereUsed-list
 * of the corresponding export
 */
const determineUsage = () => {
  for (const [listKey, listValue] of importList.entries()) {
    for (const [key, value] of listValue.entries()) {
      const exports = exportList.get(key)
      if (exports !== undefined) {
        for (const currentImport of value) {
          let specifier: string
          if (currentImport === AST_NODE_TYPES.ImportNamespaceSpecifier) {
            specifier = AST_NODE_TYPES.ImportNamespaceSpecifier
          } else if (currentImport === AST_NODE_TYPES.ImportDefaultSpecifier) {
            specifier = AST_NODE_TYPES.ImportDefaultSpecifier
          } else {
            specifier = currentImport
          }
          if (specifier !== undefined) {
            const exportStatement = exports.get(specifier)
            if (exportStatement !== undefined) {
              const { whereUsed } = exportStatement
              whereUsed.add(listKey)
              exports.set(specifier, { whereUsed })
            }
          }
        }
      }
    }
  }
}

const getSrc = (src?: string[]) => {
  if (src) {
    return src
  }
  return [process.cwd()]
}

/**
 * prepare the lists of existing imports and exports - should only be executed once at
 * the start of a new eslint run
 */
let srcFiles: Set<string>
let lastPrepareKey: string

const doPreparation = (
  src: string[] = [],
  ignoreExports: string[],
  context: RuleContext,
) => {
  const prepareKey = JSON.stringify({
    src: src.sort(),
    ignoreExports: (ignoreExports || []).sort(),
    extensions: [...getFileExtensions(context.settings)].sort(),
  })
  if (prepareKey === lastPrepareKey) {
    return
  }

  importList.clear()
  exportList.clear()
  ignoredFiles.clear()
  filesOutsideSrc.clear()

  srcFiles = resolveFiles(getSrc(src), ignoreExports, context)
  prepareImportsAndExports(srcFiles, context)
  determineUsage()
  lastPrepareKey = prepareKey
}

const newNamespaceImportExists = (specifiers: TSESTree.Node[]) =>
  specifiers.some(
    ({ type }) => type === AST_NODE_TYPES.ImportNamespaceSpecifier,
  )

const newDefaultImportExists = (specifiers: TSESTree.Node[]) =>
  specifiers.some(({ type }) => type === AST_NODE_TYPES.ImportDefaultSpecifier)

const fileIsInPkg = (file: string) => {
  const { pkg, path: pkgPath } = readPkgUp({ cwd: file })
  const basePath = path.dirname(pkgPath!)

  const checkPkgFieldString = (pkgField: string) => {
    if (path.join(basePath, pkgField) === file) {
      return true
    }
  }

  const checkPkgFieldObject = (
    pkgField: string | Partial<Record<string, string | false>>,
  ) => {
    const pkgFieldFiles = Object.values(pkgField).flatMap(value =>
      typeof value === 'boolean' ? [] : path.join(basePath, value!),
    )

    if (pkgFieldFiles.includes(file)) {
      return true
    }
  }

  const checkPkgField = (
    pkgField: string | Partial<Record<string, string | false>>,
  ) => {
    if (typeof pkgField === 'string') {
      return checkPkgFieldString(pkgField)
    }

    if (typeof pkgField === 'object') {
      return checkPkgFieldObject(pkgField)
    }
  }

  if (!pkg) {
    return false
  }

  if (pkg.private === true) {
    return false
  }

  if (pkg.bin && checkPkgField(pkg.bin)) {
    return true
  }

  if (pkg.browser && checkPkgField(pkg.browser)) {
    return true
  }

  if (pkg.main && checkPkgFieldString(pkg.main)) {
    return true
  }

  return false
}

type Options = {
  src?: string[]
  ignoreExports?: string[]
  missingExports?: string[]
  unusedExports?: boolean
}

type MessageId = 'notFound' | 'unused'

export = createRule<Options[], MessageId>({
  name: 'no-unused-modules',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Helpful warnings',
      description:
        'Forbid modules without exports, or exports without matching import in another module.',
    },
    schema: [
      {
        properties: {
          src: {
            description: 'files/paths to be analyzed (only for unused exports)',
            type: 'array',
            uniqueItems: true,
            items: {
              type: 'string',
              minLength: 1,
            },
          },
          ignoreExports: {
            description:
              'files/paths for which unused exports will not be reported (e.g module entry points)',
            type: 'array',
            uniqueItems: true,
            items: {
              type: 'string',
              minLength: 1,
            },
          },
          missingExports: {
            description: 'report modules without any exports',
            type: 'boolean',
          },
          unusedExports: {
            description: 'report exports without any usage',
            type: 'boolean',
          },
        },
        anyOf: [
          {
            properties: {
              unusedExports: { enum: [true] },
              src: {
                minItems: 1,
              },
            },
            required: ['unusedExports'],
          },
          {
            properties: {
              missingExports: { enum: [true] },
            },
            required: ['missingExports'],
          },
        ],
      },
    ],
    messages: {
      notFound: 'No exports found',
      unused: "exported declaration '{{value}}' not used within other modules",
    },
  },
  defaultOptions: [],
  create(context) {
    const {
      src,
      ignoreExports = [],
      missingExports,
      unusedExports,
    } = context.options[0] || {}

    if (unusedExports) {
      doPreparation(src, ignoreExports, context)
    }

    const file = context.getPhysicalFilename
      ? context.getPhysicalFilename()
      : context.getFilename()

    const checkExportPresence = (node: TSESTree.Program) => {
      if (!missingExports) {
        return
      }

      if (ignoredFiles.has(file)) {
        return
      }

      const exportCount = exportList.get(file)!
      const exportAll = exportCount.get(AST_NODE_TYPES.ExportAllDeclaration)!
      const namespaceImports = exportCount.get(
        AST_NODE_TYPES.ImportNamespaceSpecifier,
      )!

      exportCount.delete(AST_NODE_TYPES.ExportAllDeclaration)
      exportCount.delete(AST_NODE_TYPES.ImportNamespaceSpecifier)
      if (exportCount.size === 0) {
        // node.body[0] === 'undefined' only happens, if everything is commented out in the file
        // being linted
        context.report({
          node: node.body[0] ?? node,
          messageId: 'notFound',
        })
      }
      exportCount.set(AST_NODE_TYPES.ExportAllDeclaration, exportAll)
      exportCount.set(AST_NODE_TYPES.ImportNamespaceSpecifier, namespaceImports)
    }

    const checkUsage = (node: TSESTree.Node, exportedValue: string) => {
      if (!unusedExports) {
        return
      }

      if (ignoredFiles.has(file)) {
        return
      }

      if (fileIsInPkg(file)) {
        return
      }

      if (filesOutsideSrc.has(file)) {
        return
      }

      // make sure file to be linted is included in source files
      if (!srcFiles.has(file)) {
        srcFiles = resolveFiles(getSrc(src), ignoreExports, context)
        if (!srcFiles.has(file)) {
          filesOutsideSrc.add(file)
          return
        }
      }

      const exports = exportList.get(file)

      if (!exports) {
        console.error(
          `file \`${file}\` has no exports. Please update to the latest, and if it still happens, report this on https://github.com/import-js/eslint-plugin-import/issues/2866!`,
        )
        return
      }

      // special case: export * from
      const exportAll = exports.get(AST_NODE_TYPES.ExportAllDeclaration)
      if (
        exportAll !== undefined &&
        exportedValue !== AST_NODE_TYPES.ImportDefaultSpecifier &&
        exportAll.whereUsed.size > 0
      ) {
        return
      }

      // special case: namespace import
      const namespaceImports = exports.get(
        AST_NODE_TYPES.ImportNamespaceSpecifier,
      )
      if (
        namespaceImports !== undefined &&
        namespaceImports.whereUsed.size > 0
      ) {
        return
      }

      // exportsList will always map any imported value of 'default' to 'ImportDefaultSpecifier'
      const exportsKey =
        exportedValue === DEFAULT
          ? AST_NODE_TYPES.ImportDefaultSpecifier
          : exportedValue

      const exportStatement = exports.get(exportsKey)

      const value =
        exportsKey === AST_NODE_TYPES.ImportDefaultSpecifier
          ? DEFAULT
          : exportsKey

      if (exportStatement === undefined) {
        context.report({
          node,
          messageId: 'unused',
          data: {
            value,
          },
        })
      } else {
        if (exportStatement.whereUsed.size === 0) {
          context.report({
            node,
            messageId: 'unused',
            data: {
              value,
            },
          })
        }
      }
    }

    /**
     * only useful for tools like vscode-eslint
     *
     * update lists of existing exports during runtime
     */
    const updateExportUsage = (node: TSESTree.Program) => {
      if (ignoredFiles.has(file)) {
        return
      }

      // new module has been created during runtime
      // include it in further processing
      const exports =
        exportList.get(file) ?? new Map<string, { whereUsed: Set<string> }>()

      const newExports = new Map<string, { whereUsed: Set<string> }>()
      const newExportIdentifiers = new Set<string>()

      for (const s of node.body) {
        if (s.type === AST_NODE_TYPES.ExportDefaultDeclaration) {
          newExportIdentifiers.add(AST_NODE_TYPES.ImportDefaultSpecifier)
        }
        if (s.type === AST_NODE_TYPES.ExportNamedDeclaration) {
          if (s.specifiers.length > 0) {
            for (const specifier of s.specifiers) {
              if (specifier.exported) {
                newExportIdentifiers.add(
                  specifier.exported.name ||
                    // @ts-expect-error - legacy parser type
                    specifier.exported.value,
                )
              }
            }
          }
          forEachDeclarationIdentifier(s.declaration!, name => {
            newExportIdentifiers.add(name)
          })
        }
      }

      // old exports exist within list of new exports identifiers: add to map of new exports
      for (const [key, value] of exports.entries()) {
        if (newExportIdentifiers.has(key)) {
          newExports.set(key, value)
        }
      }

      // new export identifiers added: add to map of new exports
      for (const key of newExportIdentifiers) {
        if (!exports.has(key)) {
          newExports.set(key, { whereUsed: new Set() })
        }
      }

      // preserve information about namespace imports
      const exportAll = exports.get(AST_NODE_TYPES.ExportAllDeclaration)!
      const namespaceImports = exports.get(
        AST_NODE_TYPES.ImportNamespaceSpecifier,
      ) ?? { whereUsed: new Set() }

      newExports.set(AST_NODE_TYPES.ExportAllDeclaration, exportAll)
      newExports.set(AST_NODE_TYPES.ImportNamespaceSpecifier, namespaceImports)
      exportList.set(file, newExports)
    }

    /**
     * only useful for tools like vscode-eslint
     *
     * update lists of existing imports during runtime
     */
    const updateImportUsage = (node: TSESTree.Program) => {
      if (!unusedExports) {
        return
      }

      const oldImportPaths =
        importList.get(file) ?? new Map<string, Set<string>>()

      const oldNamespaceImports = new Set<string>()
      const newNamespaceImports = new Set<string>()

      const oldExportAll = new Set<string>()
      const newExportAll = new Set<string>()

      const oldDefaultImports = new Set<string>()
      const newDefaultImports = new Set<string>()

      const oldImports = new Map()
      const newImports = new Map()
      for (const [key, value] of oldImportPaths.entries()) {
        if (value.has(AST_NODE_TYPES.ExportAllDeclaration)) {
          oldExportAll.add(key)
        }
        if (value.has(AST_NODE_TYPES.ImportNamespaceSpecifier)) {
          oldNamespaceImports.add(key)
        }
        if (value.has(AST_NODE_TYPES.ImportDefaultSpecifier)) {
          oldDefaultImports.add(key)
        }
        for (const val of value) {
          if (
            val !== AST_NODE_TYPES.ImportNamespaceSpecifier &&
            val !== AST_NODE_TYPES.ImportDefaultSpecifier
          ) {
            oldImports.set(val, key)
          }
        }
      }

      function processDynamicImport(source: TSESTree.Node) {
        if (source.type !== 'Literal' || typeof source.value !== 'string') {
          return null
        }
        const p = resolve(source.value, context)
        if (p == null) {
          return null
        }
        newNamespaceImports.add(p)
      }

      visit(node, visitorKeyMap.get(file), {
        ImportExpression(child) {
          processDynamicImport((child as TSESTree.ImportExpression).source)
        },
        CallExpression(child_) {
          const child = child_ as TSESTree.CallExpression
          // @ts-expect-error - legacy parser type
          if (child.callee.type === 'Import') {
            processDynamicImport(child.arguments[0])
          }
        },
      })

      for (const astNode of node.body) {
        let resolvedPath: string | null | undefined

        // support for export { value } from 'module'
        if (
          astNode.type === AST_NODE_TYPES.ExportNamedDeclaration &&
          astNode.source
        ) {
          resolvedPath = resolve(
            astNode.source.raw.replaceAll(/('|")/g, ''),
            context,
          )
          for (const specifier of astNode.specifiers) {
            const name =
              specifier.local.name ||
              // @ts-expect-error - legacy parser type
              specifier.local.value
            if (name === DEFAULT) {
              newDefaultImports.add(resolvedPath!)
            } else {
              newImports.set(name, resolvedPath)
            }
          }
        }

        if (astNode.type === AST_NODE_TYPES.ExportAllDeclaration) {
          resolvedPath = resolve(
            astNode.source.raw.replaceAll(/('|")/g, ''),
            context,
          )
          newExportAll.add(resolvedPath!)
        }

        if (astNode.type === AST_NODE_TYPES.ImportDeclaration) {
          resolvedPath = resolve(
            astNode.source.raw.replaceAll(/('|")/g, ''),
            context,
          )
          if (!resolvedPath) {
            continue
          }

          if (isNodeModule(resolvedPath)) {
            continue
          }

          if (newNamespaceImportExists(astNode.specifiers)) {
            newNamespaceImports.add(resolvedPath)
          }

          if (newDefaultImportExists(astNode.specifiers)) {
            newDefaultImports.add(resolvedPath)
          }

          for (const specifier of astNode.specifiers.filter(
            specifier =>
              specifier.type !== AST_NODE_TYPES.ImportDefaultSpecifier &&
              specifier.type !== AST_NODE_TYPES.ImportNamespaceSpecifier,
          )) {
            if ('imported' in specifier) {
              newImports.set(
                specifier.imported.name ||
                  // @ts-expect-error - legacy parser type
                  specifier.imported.value,
                resolvedPath,
              )
            }
          }
        }
      }

      for (const value of newExportAll) {
        if (!oldExportAll.has(value)) {
          const imports = oldImportPaths.get(value) ?? new Set()
          imports.add(AST_NODE_TYPES.ExportAllDeclaration)
          oldImportPaths.set(value, imports)

          let exports = exportList.get(value)
          let currentExport: { whereUsed: Set<string> } | undefined
          if (exports === undefined) {
            exports = new Map()
            exportList.set(value, exports)
          } else {
            currentExport = exports.get(AST_NODE_TYPES.ExportAllDeclaration)
          }

          if (currentExport === undefined) {
            const whereUsed = new Set<string>()
            whereUsed.add(file)
            exports.set(AST_NODE_TYPES.ExportAllDeclaration, {
              whereUsed,
            })
          } else {
            currentExport.whereUsed.add(file)
          }
        }
      }

      for (const value of oldExportAll) {
        if (!newExportAll.has(value)) {
          const imports = oldImportPaths.get(value)!
          imports.delete(AST_NODE_TYPES.ExportAllDeclaration)

          const exports = exportList.get(value)
          if (exports !== undefined) {
            const currentExport = exports.get(
              AST_NODE_TYPES.ExportAllDeclaration,
            )
            if (currentExport !== undefined) {
              currentExport.whereUsed.delete(file)
            }
          }
        }
      }

      for (const value of newDefaultImports) {
        if (!oldDefaultImports.has(value)) {
          let imports = oldImportPaths.get(value)
          if (imports === undefined) {
            imports = new Set()
          }
          imports.add(AST_NODE_TYPES.ImportDefaultSpecifier)
          oldImportPaths.set(value, imports)

          let exports = exportList.get(value)
          let currentExport
          if (exports === undefined) {
            exports = new Map()
            exportList.set(value, exports)
          } else {
            currentExport = exports.get(AST_NODE_TYPES.ImportDefaultSpecifier)
          }

          if (currentExport === undefined) {
            const whereUsed = new Set<string>()
            whereUsed.add(file)
            exports.set(AST_NODE_TYPES.ImportDefaultSpecifier, {
              whereUsed,
            })
          } else {
            currentExport.whereUsed.add(file)
          }
        }
      }

      for (const value of oldDefaultImports) {
        if (!newDefaultImports.has(value)) {
          const imports = oldImportPaths.get(value)!
          imports.delete(AST_NODE_TYPES.ImportDefaultSpecifier)

          const exports = exportList.get(value)
          if (exports !== undefined) {
            const currentExport = exports.get(
              AST_NODE_TYPES.ImportDefaultSpecifier,
            )
            if (currentExport !== undefined) {
              currentExport.whereUsed.delete(file)
            }
          }
        }
      }

      for (const value of newNamespaceImports) {
        if (!oldNamespaceImports.has(value)) {
          let imports = oldImportPaths.get(value)
          if (imports === undefined) {
            imports = new Set()
          }
          imports.add(AST_NODE_TYPES.ImportNamespaceSpecifier)
          oldImportPaths.set(value, imports)

          let exports = exportList.get(value)
          let currentExport
          if (exports === undefined) {
            exports = new Map()
            exportList.set(value, exports)
          } else {
            currentExport = exports.get(AST_NODE_TYPES.ImportNamespaceSpecifier)
          }

          if (currentExport === undefined) {
            const whereUsed = new Set<string>()
            whereUsed.add(file)
            exports.set(AST_NODE_TYPES.ImportNamespaceSpecifier, {
              whereUsed,
            })
          } else {
            currentExport.whereUsed.add(file)
          }
        }
      }

      for (const value of oldNamespaceImports) {
        if (!newNamespaceImports.has(value)) {
          const imports = oldImportPaths.get(value)!
          imports.delete(AST_NODE_TYPES.ImportNamespaceSpecifier)

          const exports = exportList.get(value)
          if (exports !== undefined) {
            const currentExport = exports.get(
              AST_NODE_TYPES.ImportNamespaceSpecifier,
            )
            if (currentExport !== undefined) {
              currentExport.whereUsed.delete(file)
            }
          }
        }
      }

      for (const [key, value] of newImports.entries()) {
        if (!oldImports.has(key)) {
          let imports = oldImportPaths.get(value)
          if (imports === undefined) {
            imports = new Set()
          }
          imports.add(key)
          oldImportPaths.set(value, imports)

          let exports = exportList.get(value)
          let currentExport
          if (exports === undefined) {
            exports = new Map()
            exportList.set(value, exports)
          } else {
            currentExport = exports.get(key)
          }

          if (currentExport === undefined) {
            const whereUsed = new Set<string>()
            whereUsed.add(file)
            exports.set(key, { whereUsed })
          } else {
            currentExport.whereUsed.add(file)
          }
        }
      }

      for (const [key, value] of oldImports.entries()) {
        if (!newImports.has(key)) {
          const imports = oldImportPaths.get(value)!
          imports.delete(key)

          const exports = exportList.get(value)
          if (exports !== undefined) {
            const currentExport = exports.get(key)
            if (currentExport !== undefined) {
              currentExport.whereUsed.delete(file)
            }
          }
        }
      }
    }

    return {
      'Program:exit'(node: TSESTree.Program) {
        updateExportUsage(node)
        updateImportUsage(node)
        checkExportPresence(node)
      },
      ExportDefaultDeclaration(node) {
        checkUsage(node, AST_NODE_TYPES.ImportDefaultSpecifier)
      },
      ExportNamedDeclaration(node) {
        for (const specifier of node.specifiers) {
          checkUsage(
            specifier,
            specifier.exported.name ||
              // @ts-expect-error - legacy parser type
              specifier.exported.value,
          )
        }
        forEachDeclarationIdentifier(node.declaration, name => {
          checkUsage(node, name)
        })
      },
    }
  },
})
