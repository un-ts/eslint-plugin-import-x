import type { ESLintUtils, TSESLint } from '@typescript-eslint/utils'

import { applyDefault } from './apply-default.js'
import { docsUrl } from './docs-url.js'

/**
 * Creates reusable function to create rules with default options and docs URLs.
 *
 * @param urlCreator Creates a documentation URL for a given rule name.
 * @returns Function to create a rule with the docs URL format.
 */
export function RuleCreator<PluginDocs = unknown>(
  urlCreator: (ruleName: string) => string,
) {
  // This function will get much easier to call when this is merged https://github.com/Microsoft/TypeScript/pull/26349
  // TODO - when the above PR lands; add type checking for the context.report `data` property
  return function createNamedRule<
    Options extends readonly unknown[],
    MessageIds extends string,
  >({
    meta,
    name,
    ...rule
  }: Readonly<
    ESLintUtils.RuleWithMetaAndName<Options, MessageIds, PluginDocs>
  >): TSESLint.RuleModule<MessageIds, Options, PluginDocs> {
    return createRule_<Options, MessageIds, PluginDocs>({
      meta: {
        ...meta,
        docs: {
          ...meta.docs,
          url: urlCreator(name),
        },
      },
      ...rule,
    })
  }
}

function createRule_<
  Options extends readonly unknown[],
  MessageIds extends string,
  PluginDocs = unknown,
>({
  create,
  defaultOptions,
  meta,
}: Readonly<
  ESLintUtils.RuleWithMeta<Options, MessageIds, PluginDocs>
>): TSESLint.RuleModule<MessageIds, Options, PluginDocs> {
  return {
    create(
      context: Readonly<TSESLint.RuleContext<MessageIds, Options>>,
    ): TSESLint.RuleListener {
      const optionsWithDefault = applyDefault(defaultOptions, context.options)
      return create(context, optionsWithDefault)
    },
    defaultOptions,
    meta,
  }
}

export interface ImportXPluginDocs {
  /** The category the rule falls under */
  category?: string

  recommended?: true
}

export const createRule = RuleCreator<ImportXPluginDocs>(docsUrl)
