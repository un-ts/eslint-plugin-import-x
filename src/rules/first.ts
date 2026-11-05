import type { TSESLint, TSESTree } from '@typescript-eslint/utils'

import type { RuleContext } from '../types.js'
import { createRule } from '../utils/index.js'

// A next-line directive applies to the line below it; inserting a moved import
// between the directive and that line would retarget it.
const LINE_SCOPED_NEXT_DIRECTIVE =
  /^\s*(?:eslint-disable-next-line|@ts-ignore|@ts-expect-error)(?:\s|$)/

function getImportValue(node: TSESTree.ProgramStatement) {
  return node.type === 'ImportDeclaration'
    ? node.source.value
    : 'moduleReference' in node &&
        'expression' in node.moduleReference &&
        'value' in node.moduleReference.expression &&
        node.moduleReference.expression.value
}

function isPossibleDirective(node: TSESTree.ProgramStatement) {
  return (
    node.type === 'ExpressionStatement' &&
    node.expression.type === 'Literal' &&
    typeof node.expression.value === 'string'
  )
}

export type Options = 'absolute-first' | 'disable-absolute-first'

export type MessageId = 'absolute' | 'order'

export default createRule<[Options?], MessageId>({
  name: 'first',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Style guide',
      description: 'Ensure all imports appear before other statements.',
    },
    fixable: 'code',
    schema: [
      {
        type: 'string',
        enum: ['absolute-first', 'disable-absolute-first'],
      },
    ],
    messages: {
      absolute: 'Absolute imports should come before relative imports.',
      order: 'Import in body of module; reorder to top.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      Program(n) {
        const body = n.body
        if (!body?.length) {
          return
        }

        const absoluteFirst = context.options[0] === 'absolute-first'
        const { sourceCode } = context
        const originSourceCode = sourceCode.getText()

        let nonImportCount = 0
        let anyExpressions = false
        let anyRelative = false

        let lastLegalImp: TSESTree.ProgramStatement | null = null
        let lastDirective: TSESTree.ProgramStatement | null = null

        const errorInfos: Array<{
          node: TSESTree.ProgramStatement
          range: [number, number]
        }> = []

        let shouldSort = true
        let lastSortNodesIndex = 0

        for (const [index, node] of body.entries()) {
          if (!anyExpressions && isPossibleDirective(node)) {
            lastDirective = node
            continue
          }

          anyExpressions = true

          if (
            node.type === 'ImportDeclaration' ||
            node.type === 'TSImportEqualsDeclaration'
          ) {
            if (absoluteFirst) {
              const importValue = getImportValue(node)
              if (typeof importValue === 'string' && /^\./.test(importValue)) {
                anyRelative = true
              } else if (anyRelative) {
                context.report({
                  node:
                    node.type === 'ImportDeclaration'
                      ? node.source
                      : node.moduleReference,
                  messageId: 'absolute',
                })
              }
            }

            if (nonImportCount > 0) {
              /** @see https://eslint.org/docs/next/use/migrate-to-9.0.0#-removed-multiple-context-methods */
              for (const variable of (
                sourceCode as unknown as RuleContext
              ).getDeclaredVariables(node)) {
                if (!shouldSort) {
                  break
                }

                for (const reference of variable.references) {
                  if (reference.identifier.range[0] < node.range[1]) {
                    shouldSort = false
                    break
                  }
                }
              }

              if (shouldSort) {
                lastSortNodesIndex = errorInfos.length
              }

              errorInfos.push({
                node,
                range: [body[index - 1].range[1], node.range[1]],
              })
            } else {
              lastLegalImp = node
            }
          } else {
            nonImportCount++
          }
        }

        if (errorInfos.length === 0) {
          return
        }

        for (const [index, { node }] of errorInfos.entries()) {
          let fix: TSESLint.ReportFixFunction | undefined

          if (index < lastSortNodesIndex) {
            fix = (fixer: TSESLint.RuleFixer) => fixer.insertTextAfter(node, '')
          } else if (index === lastSortNodesIndex) {
            const sortNodes = errorInfos.slice(0, lastSortNodesIndex + 1)
            fix = (fixer: TSESLint.RuleFixer) => {
              // A next-line suppression above a moved import would be left
              // behind, so omit the fix rather than move the import out of it.
              if (
                sortNodes.some(({ node: sortNode }) =>
                  sourceCode
                    .getCommentsBefore(sortNode)
                    .some(comment =>
                      LINE_SCOPED_NEXT_DIRECTIVE.test(comment.value),
                    ),
                )
              ) {
                return null
              }

              const removeFixers = sortNodes.map(({ range }) =>
                fixer.removeRange(range),
              )
              const range = [
                0,
                removeFixers[removeFixers.length - 1].range[1],
              ] as const

              let insertSourceCode = sortNodes
                .map(({ range }) => {
                  const nodeSourceCode = originSourceCode.slice(...range)
                  if (/\S/.test(nodeSourceCode[0])) {
                    return `\n${nodeSourceCode}`
                  }
                  return nodeSourceCode
                })
                .join('')

              let replaceSourceCode = ''

              // Directives such as `'use client'` only work at the very top,
              // so imports moved up go after them
              const insertAfterNode = lastLegalImp ?? lastDirective

              if (!insertAfterNode) {
                insertSourceCode =
                  insertSourceCode.trim() + insertSourceCode.match(/^(\s+)/)![0]
              }

              // When inserting after a directive with no trailing newline, add one
              // to prevent the moved import from being glued to the next statement.
              const insertingAfterDirective = !lastLegalImp && !!lastDirective
              // A moved import that shared a line with the statement before it
              // keeps its leading space; start it on its own line instead, so a
              // directive without a semicolon doesn't become `'use client' import`
              if (insertingAfterDirective) {
                insertSourceCode = `\n${insertSourceCode.trimStart()}`
              }

              // When inserting after a directive, advance past any trailing
              // same-line comments (e.g. // eslint-disable-line) so they stay
              // on the directive's line and inline disable directives remain
              // effective.
              let effectiveInsertAfterNode:
                | TSESTree.Node
                | TSESTree.Token
                | null = insertAfterNode
              if (insertingAfterDirective && insertAfterNode) {
                let token: TSESTree.Node | TSESTree.Token = insertAfterNode
                for (;;) {
                  const next: TSESTree.Token | null = sourceCode.getTokenAfter(
                    token,
                    { includeComments: true },
                  )
                  if (
                    next &&
                    (next.type === 'Line' || next.type === 'Block') &&
                    next.loc.start.line === token.loc.end.line
                  ) {
                    // Keep a next-line directive above the statement it covers.
                    if (LINE_SCOPED_NEXT_DIRECTIVE.test(next.value)) {
                      break
                    }
                    token = next
                  } else {
                    break
                  }
                }
                effectiveInsertAfterNode = token
              }

              const insertFixer = insertAfterNode
                ? fixer.insertTextAfter(
                    effectiveInsertAfterNode!,
                    insertingAfterDirective &&
                      !/^[^\S\n]*\n/.test(
                        originSourceCode.slice(
                          effectiveInsertAfterNode!.range![1],
                        ),
                      )
                      ? `${insertSourceCode}\n`
                      : insertSourceCode,
                  )
                : fixer.insertTextBefore(body[0], insertSourceCode)

              const fixers = [insertFixer, ...removeFixers]
              for (const [i, computedFixer] of fixers.entries()) {
                replaceSourceCode +=
                  originSourceCode.slice(
                    fixers[i - 1] ? fixers[i - 1].range[1] : 0,
                    computedFixer.range[0],
                  ) + computedFixer.text
              }

              return fixer.replaceTextRange(range, replaceSourceCode)
            }
          }
          context.report({
            node,
            messageId: 'order',
            fix,
          })
        }
      },
    }
  },
})
