import fs from 'node:fs'
import path from 'node:path'

import type { TSESTree } from '@typescript-eslint/utils'
import { minimatch } from 'minimatch'
import type { PackageJson } from 'type-fest'

import type { RuleContext } from '../types'
import {
  createRule,
  moduleVisitor,
  resolve,
  pkgUp,
  importType,
  getFilePackageName,
} from '../utils'

type PackageDeps = ReturnType<typeof extractDepFields>

const depFieldCache = new Map<string, PackageDeps>()

function hasKeys(obj: object = {}) {
  return Object.keys(obj).length > 0
}

function arrayOrKeys(arrayOrObject: object | string[]) {
  return Array.isArray(arrayOrObject)
    ? (arrayOrObject as string[])
    : Object.keys(arrayOrObject)
}

function readJSON<T>(jsonPath: string, throwException: boolean) {
  try {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as T
  } catch (error) {
    if (throwException) {
      throw error
    }
  }
}

function extractDepFields(pkg: PackageJson) {
  return {
    dependencies: pkg.dependencies || {},
    devDependencies: pkg.devDependencies || {},
    optionalDependencies: pkg.optionalDependencies || {},
    peerDependencies: pkg.peerDependencies || {},
    // BundledDeps should be in the form of an array, but object notation is also supported by
    // `npm`, so we convert it to an array if it is an object
    bundledDependencies: arrayOrKeys(
      pkg.bundleDependencies || pkg.bundledDependencies || [],
    ),
  }
}

function getPackageDepFields(packageJsonPath: string, throwAtRead: boolean) {
  if (!depFieldCache.has(packageJsonPath)) {
    const depFields = extractDepFields(readJSON(packageJsonPath, throwAtRead)!)
    depFieldCache.set(packageJsonPath, depFields)
  }
  return depFieldCache.get(packageJsonPath)
}

function getDependencies(context: RuleContext, packageDir?: string | string[]) {
  let paths: string[] = []

  try {
    let packageContent: PackageDeps = {
      dependencies: {},
      devDependencies: {},
      optionalDependencies: {},
      peerDependencies: {},
      bundledDependencies: [],
    }

    if (packageDir && packageDir.length > 0) {
      paths = Array.isArray(packageDir)
        ? packageDir.map(dir => path.resolve(dir))
        : [path.resolve(packageDir)]
    }

    if (paths.length > 0) {
      // use rule config to find package.json
      for (const dir of paths) {
        const packageJsonPath = path.resolve(dir, 'package.json')
        const packageContent_ = getPackageDepFields(packageJsonPath, true)!
        for (const depsKey of Object.keys(packageContent)) {
          const key = depsKey as keyof PackageDeps
          Object.assign(packageContent[key], packageContent_[key])
        }
      }
    } else {
      // use closest package.json
      const packageJsonPath = pkgUp({
        cwd: context.physicalFilename,
      })!

      const packageContent_ = getPackageDepFields(packageJsonPath, false)

      if (packageContent_) {
        packageContent = packageContent_
      }
    }

    if (
      ![
        packageContent.dependencies,
        packageContent.devDependencies,
        packageContent.optionalDependencies,
        packageContent.peerDependencies,
        packageContent.bundledDependencies,
      ].some(hasKeys)
    ) {
      return
    }

    return packageContent
  } catch (error_) {
    const error = error_ as Error & { code: string }

    if (paths.length > 0 && error.code === 'ENOENT') {
      context.report({
        messageId: 'pkgNotFound',
        loc: { line: 0, column: 0 },
      })
    }
    if (error.name === 'JSONError' || error instanceof SyntaxError) {
      context.report({
        messageId: 'pkgUnparsable',
        data: { error: error.message },
        loc: { line: 0, column: 0 },
      })
    }
  }
}

function getModuleOriginalName(name: string) {
  const [first, second] = name.split('/')
  return first.startsWith('@') ? `${first}/${second}` : first
}

type DepDeclaration = {
  isInDeps: boolean
  isInDevDeps: boolean
  isInOptDeps: boolean
  isInPeerDeps: boolean
  isInBundledDeps: boolean
}

function checkDependencyDeclaration(
  deps: PackageDeps,
  packageName: string,
  declarationStatus?: DepDeclaration,
) {
  const newDeclarationStatus = declarationStatus || {
    isInDeps: false,
    isInDevDeps: false,
    isInOptDeps: false,
    isInPeerDeps: false,
    isInBundledDeps: false,
  }

  // in case of sub package.json inside a module
  // check the dependencies on all hierarchy
  const packageHierarchy: string[] = []
  const packageNameParts = packageName ? packageName.split('/') : []

  for (const [index, namePart] of packageNameParts.entries()) {
    if (!namePart.startsWith('@')) {
      const ancestor = packageNameParts.slice(0, index + 1).join('/')
      packageHierarchy.push(ancestor)
    }
  }

  return packageHierarchy.reduce(
    (result, ancestorName) => ({
      isInDeps:
        result.isInDeps || deps.dependencies[ancestorName] !== undefined,
      isInDevDeps:
        result.isInDevDeps || deps.devDependencies[ancestorName] !== undefined,
      isInOptDeps:
        result.isInOptDeps ||
        deps.optionalDependencies[ancestorName] !== undefined,
      isInPeerDeps:
        result.isInPeerDeps ||
        deps.peerDependencies[ancestorName] !== undefined,
      isInBundledDeps:
        result.isInBundledDeps ||
        deps.bundledDependencies.includes(ancestorName),
    }),
    newDeclarationStatus,
  )
}

type DepsOptions = {
  allowDevDeps: boolean
  allowOptDeps: boolean
  allowPeerDeps: boolean
  allowBundledDeps: boolean
  verifyInternalDeps: boolean
  verifyTypeImports: boolean
}

function reportIfMissing(
  context: RuleContext<MessageId>,
  deps: PackageDeps,
  depsOptions: DepsOptions,
  node: TSESTree.Node,
  name: string,
) {
  // Do not report when importing types unless option is enabled
  if (
    !depsOptions.verifyTypeImports &&
    (('importKind' in node &&
      (node.importKind === 'type' ||
        // @ts-expect-error - flow type
        node.importKind === 'typeof')) ||
      ('exportKind' in node && node.exportKind === 'type') ||
      ('specifiers' in node &&
        Array.isArray(node.specifiers) &&
        node.specifiers.length > 0 &&
        (
          node.specifiers as Array<
            TSESTree.ExportSpecifier | TSESTree.ImportClause
          >
        ).every(
          specifier =>
            'importKind' in specifier &&
            (specifier.importKind === 'type' ||
              // @ts-expect-error - flow type
              specifier.importKind === 'typeof'),
        )))
  ) {
    return
  }

  const typeOfImport = importType(name, context)

  if (
    typeOfImport !== 'external' &&
    (typeOfImport !== 'internal' || !depsOptions.verifyInternalDeps)
  ) {
    return
  }

  const resolved = resolve(name, context)
  if (!resolved) {
    return
  }

  const importPackageName = getModuleOriginalName(name)
  let declarationStatus = checkDependencyDeclaration(deps, importPackageName)

  if (
    declarationStatus.isInDeps ||
    (depsOptions.allowDevDeps && declarationStatus.isInDevDeps) ||
    (depsOptions.allowPeerDeps && declarationStatus.isInPeerDeps) ||
    (depsOptions.allowOptDeps && declarationStatus.isInOptDeps) ||
    (depsOptions.allowBundledDeps && declarationStatus.isInBundledDeps)
  ) {
    return
  }

  // test the real name from the resolved package.json
  // if not aliased imports (alias/react for example), importPackageName can be misinterpreted
  const realPackageName = getFilePackageName(resolved)
  if (realPackageName && realPackageName !== importPackageName) {
    declarationStatus = checkDependencyDeclaration(
      deps,
      realPackageName,
      declarationStatus,
    )

    if (
      declarationStatus.isInDeps ||
      (depsOptions.allowDevDeps && declarationStatus.isInDevDeps) ||
      (depsOptions.allowPeerDeps && declarationStatus.isInPeerDeps) ||
      (depsOptions.allowOptDeps && declarationStatus.isInOptDeps) ||
      (depsOptions.allowBundledDeps && declarationStatus.isInBundledDeps)
    ) {
      return
    }
  }

  const packageName = realPackageName || importPackageName

  if (declarationStatus.isInDevDeps && !depsOptions.allowDevDeps) {
    context.report({
      node,
      messageId: 'devDep',
      data: {
        packageName,
      },
    })
    return
  }

  if (declarationStatus.isInOptDeps && !depsOptions.allowOptDeps) {
    context.report({
      node,
      messageId: 'optDep',
      data: {
        packageName,
      },
    })
    return
  }

  context.report({
    node,
    messageId: 'missing',
    data: {
      packageName,
    },
  })
}

function testConfig(config: string[] | boolean | undefined, filename: string) {
  // Simplest configuration first, either a boolean or nothing.
  if (typeof config === 'boolean' || config === undefined) {
    return config
  }
  // Array of globs.
  return config.some(
    c => minimatch(filename, c) || minimatch(filename, path.resolve(c)),
  )
}

type Options = {
  packageDir?: string | string[]
  devDependencies?: boolean
  optionalDependencies?: boolean
  peerDependencies?: boolean
  bundledDependencies?: boolean
  includeInternal?: boolean
  includeTypes?: boolean
}

type MessageId =
  | 'pkgNotFound'
  | 'pkgUnparsable'
  | 'devDep'
  | 'optDep'
  | 'missing'

export = createRule<[Options?], MessageId>({
  name: 'no-extraneous-dependencies',
  meta: {
    type: 'problem',
    docs: {
      category: 'Helpful warnings',
      description: 'Forbid the use of extraneous packages.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          devDependencies: { type: ['boolean', 'array'] },
          optionalDependencies: { type: ['boolean', 'array'] },
          peerDependencies: { type: ['boolean', 'array'] },
          bundledDependencies: { type: ['boolean', 'array'] },
          packageDir: { type: ['string', 'array'] },
          includeInternal: { type: ['boolean'] },
          includeTypes: { type: ['boolean'] },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      pkgNotFound: 'The package.json file could not be found.',
      pkgUnparsable: 'The package.json file could not be parsed: {{error}}',
      devDep:
        "'{{packageName}}' should be listed in the project's dependencies, not devDependencies.",
      optDep:
        "'{{packageName}}' should be listed in the project's dependencies, not optionalDependencies.",
      missing:
        "'{{packageName}}' should be listed in the project's dependencies. Run 'npm i -S {{packageName}}' to add it",
    },
  },
  defaultOptions: [],
  create(context) {
    const options = context.options[0] || {}

    const filename = context.physicalFilename

    const deps =
      getDependencies(context, options.packageDir) || extractDepFields({})

    const depsOptions = {
      allowDevDeps: testConfig(options.devDependencies, filename) !== false,
      allowOptDeps:
        testConfig(options.optionalDependencies, filename) !== false,
      allowPeerDeps: testConfig(options.peerDependencies, filename) !== false,
      allowBundledDeps:
        testConfig(options.bundledDependencies, filename) !== false,
      verifyInternalDeps: !!options.includeInternal,
      verifyTypeImports: !!options.includeTypes,
    }

    return {
      ...moduleVisitor(
        (source, node) => {
          reportIfMissing(context, deps, depsOptions, node, source.value)
        },
        { commonjs: true },
      ),
      'Program:exit'() {
        depFieldCache.clear()
      },
    }
  },
})
