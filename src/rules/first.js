import docsUrl from '../docsUrl'

function getImportValue(node) {
  return node.type === 'ImportDeclaration'
    ? node.source.value
    : node.moduleReference.expression.value
}

function isPossibleDirective(node) {
  return (
    node.type === 'ExpressionStatement' &&
    node.expression.type === 'Literal' &&
    typeof node.expression.value === 'string'
  )
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Style guide',
      description: 'Ensure all imports appear before other statements.',
      url: docsUrl('first'),
    },
    fixable: 'code',
    schema: [
      {
        type: 'string',
        enum: ['absolute-first', 'disable-absolute-first'],
      },
    ],
  },

  create(context) {
    return {
      Program(n) {
        const body = n.body
        if (!body) {
          return
        }
        const absoluteFirst = context.options[0] === 'absolute-first'
        const message = 'Import in body of module; reorder to top.'
        const sourceCode = context.getSourceCode()
        const originSourceCode = sourceCode.getText()
        let nonImportCount = 0
        let anyExpressions = false
        let anyRelative = false
        let lastLegalImp = null
        const errorInfos = []
        let shouldSort = true
        let lastSortNodesIndex = 0
        for (const [index, node] of body.entries()) {
          if (!anyExpressions && isPossibleDirective(node)) {
            continue
          }

          anyExpressions = true

          if (
            node.type === 'ImportDeclaration' ||
            node.type === 'TSImportEqualsDeclaration'
          ) {
            if (absoluteFirst) {
              if (/^\./.test(getImportValue(node))) {
                anyRelative = true
              } else if (anyRelative) {
                context.report({
                  node:
                    node.type === 'ImportDeclaration'
                      ? node.source
                      : node.moduleReference,
                  message:
                    'Absolute imports should come before relative imports.',
                })
              }
            }
            if (nonImportCount > 0) {
              for (const variable of context.getDeclaredVariables(node)) {
                if (!shouldSort) {
                  break
                }
                const references = variable.references
                if (references.length > 0) {
                  for (const reference of references) {
                    if (reference.identifier.range[0] < node.range[1]) {
                      shouldSort = false
                      break
                    }
                  }
                }
              }
              shouldSort && (lastSortNodesIndex = errorInfos.length)
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
        for (const [index, errorInfo] of errorInfos.entries()) {
          const node = errorInfo.node
          const infos = {
            node,
            message,
          }
          if (index < lastSortNodesIndex) {
            infos.fix = function (fixer) {
              return fixer.insertTextAfter(node, '')
            }
          } else if (index === lastSortNodesIndex) {
            const sortNodes = errorInfos.slice(0, lastSortNodesIndex + 1)
            infos.fix = function (fixer) {
              const removeFixers = sortNodes.map(function (_errorInfo) {
                return fixer.removeRange(_errorInfo.range)
              })
              const range = [0, removeFixers[removeFixers.length - 1].range[1]]
              let insertSourceCode = sortNodes
                .map(function (_errorInfo) {
                  const nodeSourceCode = String.prototype.slice.apply(
                    originSourceCode,
                    _errorInfo.range,
                  )
                  if (/\S/.test(nodeSourceCode[0])) {
                    return `\n${nodeSourceCode}`
                  }
                  return nodeSourceCode
                })
                .join('')
              let insertFixer = null
              let replaceSourceCode = ''
              if (!lastLegalImp) {
                insertSourceCode =
                  insertSourceCode.trim() + insertSourceCode.match(/^(\s+)/)[0]
              }
              insertFixer = lastLegalImp
                ? fixer.insertTextAfter(lastLegalImp, insertSourceCode)
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
          context.report(infos)
        }
      },
    }
  },
}
