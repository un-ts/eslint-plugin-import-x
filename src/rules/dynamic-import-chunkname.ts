import vm from 'vm'

import type { TSESTree } from '@typescript-eslint/utils'

import { createRule } from '../utils'

type Options = {
  allowEmpty?: boolean
  importFunctions?: readonly string[]
  webpackChunknameFormat?: string
}

type MessageId =
  | 'leadingComment'
  | 'blockComment'
  | 'paddedSpaces'
  | 'webpackComment'
  | 'chunknameFormat'

export = createRule<[Options?], MessageId>({
  name: 'dynamic-import-chunkname',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Style guide',
      description:
        'Enforce a leading comment with the webpackChunkName for dynamic imports.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          importFunctions: {
            type: 'array',
            uniqueItems: true,
            items: {
              type: 'string',
            },
          },
          allowEmpty: {
            type: 'boolean',
          },
          webpackChunknameFormat: {
            type: 'string',
          },
        },
      },
    ],
    messages: {
      leadingComment:
        'dynamic imports require a leading comment with the webpack chunkname',
      blockComment:
        'dynamic imports require a /* foo */ style comment, not a // foo comment',
      paddedSpaces:
        'dynamic imports require a block comment padded with spaces - /* foo */',
      webpackComment:
        'dynamic imports require a "webpack" comment with valid syntax',
      chunknameFormat:
        'dynamic imports require a leading comment in the form /*{{format}}*/',
    },
  },
  defaultOptions: [],
  create(context) {
    const {
      importFunctions = [],
      allowEmpty = false,
      webpackChunknameFormat = '([0-9a-zA-Z-_/.]|\\[(request|index)\\])+',
    } = context.options[0] || {}

    const paddedCommentRegex = /^ (\S[\s\S]+\S) $/
    const commentStyleRegex =
      /^( ((webpackChunkName: .+)|((webpackPrefetch|webpackPreload): (true|false|-?[0-9]+))|(webpackIgnore: (true|false))|((webpackInclude|webpackExclude): \/.*\/)|(webpackMode: ["'](lazy|lazy-once|eager|weak)["'])|(webpackExports: (['"]\w+['"]|\[(['"]\w+['"], *)+(['"]\w+['"]*)\]))),?)+ $/
    const chunkSubstrFormat = ` webpackChunkName: ["']${webpackChunknameFormat}["'],? `
    const chunkSubstrRegex = new RegExp(chunkSubstrFormat)

    function run(node: TSESTree.Node, arg: TSESTree.Node) {
      const sourceCode = context.getSourceCode()
      const leadingComments = sourceCode.getCommentsBefore(arg)

      if ((!leadingComments || leadingComments.length === 0) && !allowEmpty) {
        context.report({
          node,
          messageId: 'leadingComment',
        })
        return
      }

      let isChunknamePresent = false

      for (const comment of leadingComments) {
        if (comment.type !== 'Block') {
          context.report({
            node,
            messageId: 'blockComment',
          })
          return
        }

        if (!paddedCommentRegex.test(comment.value)) {
          context.report({
            node,
            messageId: 'paddedSpaces',
          })
          return
        }

        try {
          // just like webpack itself does
          vm.runInNewContext(`(function() {return {${comment.value}}})()`)
        } catch (error) {
          context.report({
            node,
            messageId: 'webpackComment',
          })
          return
        }

        if (!commentStyleRegex.test(comment.value)) {
          context.report({
            node,
            messageId: 'webpackComment',
          })
          return
        }

        if (chunkSubstrRegex.test(comment.value)) {
          isChunknamePresent = true
        }
      }

      if (!isChunknamePresent && !allowEmpty) {
        context.report({
          node,
          messageId: 'chunknameFormat',
          data: {
            format: chunkSubstrFormat,
          },
        })
      }
    }

    return {
      ImportExpression(node) {
        run(node, node.source)
      },

      CallExpression(node) {
        if (
          // @ts-expect-error - legacy parser type
          node.callee.type !== 'Import' &&
          'name' in node.callee &&
          importFunctions.indexOf(node.callee.name) < 0
        ) {
          return
        }

        run(node, node.arguments[0])
      },
    }
  },
})
