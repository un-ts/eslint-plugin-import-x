import type { TSESLint } from '@typescript-eslint/utils'
import { ESLintUtils } from '@typescript-eslint/utils'

import { docsUrl } from './docs-url'

// TSESLint.RuleMetaDataDocs, but with "category" property for eslint-doc-generator
type MetaDataDocsWithCategory<Options extends readonly unknown[]> = {
  /**
   * The category the rule falls under
   */
  category?: string

  recommended?:
    | TSESLint.RuleRecommendation
    | TSESLint.RuleRecommendationAcrossConfigs<Options>
    | boolean
} & Omit<TSESLint.RuleMetaDataDocs<Options>, 'recommended'>

// TSESLint.RuleMetaData, but with "docs" property overriden for eslint-doc-generator
type MetadataWithCustomDocs<
  MessageIDs extends string,
  Options extends readonly unknown[],
> = {
  docs: MetaDataDocsWithCategory<Options>
} & Omit<TSESLint.RuleMetaData<MessageIDs, Options>, 'docs'>

// TSESLint.RuleModule, but with "meta" property overriden for eslint-doc-generator
export type RuleModuleWithCustomMeta<
  MessageIds extends string,
  Options extends readonly unknown[] = [],
  ExtendedRuleListener extends TSESLint.RuleListener = TSESLint.RuleListener,
> = {
  meta: MetadataWithCustomDocs<MessageIds, Options>
} & Omit<TSESLint.RuleModule<MessageIds, Options, ExtendedRuleListener>, 'meta'>

type RuleCreateOption<
  Options extends readonly unknown[],
  MessageIds extends string,
> = {
  meta: MetadataWithCustomDocs<MessageIds, Options>
  commitHash?: string
} & Omit<ESLintUtils.RuleWithMetaAndName<Options, MessageIds>, 'meta'>

export function createRule<
  Options extends readonly unknown[],
  MessageIds extends string,
>({
  name,
  meta,
  commitHash,
  ...rules
}: Readonly<RuleCreateOption<Options, MessageIds>>): RuleModuleWithCustomMeta<
  MessageIds,
  Options
> {
  const { docs, ...metaWithoutDocs } = meta
  return {
    ...ESLintUtils.RuleCreator.withoutDocs({
      meta: metaWithoutDocs,
      ...rules,
    }),
    meta: {
      ...meta,
      docs: {
        ...docs,
        url: docsUrl(name, commitHash),
      },
    },
  }
}
