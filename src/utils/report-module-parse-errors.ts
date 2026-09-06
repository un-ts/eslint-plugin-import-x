import type { TSESTree } from '@typescript-eslint/utils'

import type { ParseError, RuleContext } from '../types.js'

/**
 * Report parse errors encountered while analyzing an imported module, on the
 * importing declaration's source literal.
 *
 * Rules own reporting — `ModuleInfo` only exposes the error as data. Each rule
 * calls this itself, and deliberately without cross-rule dedupe: diagnostics
 * are attributed per rule ID and users disable rules individually, so one
 * rule must never swallow another rule's report.
 */
export function reportModuleParseErrors(
  context: RuleContext,
  moduleInfo: { parseError: ParseError | undefined },
  declaration: { source: TSESTree.Literal | null },
) {
  const err = moduleInfo.parseError
  // nothing to report, or nowhere to report it — a rule must never throw
  if (!err || !declaration.source) {
    return
  }
  const msg = `${err.message} (${err.lineNumber}:${err.column})`
  context.report({
    node: declaration.source,
    // @ts-expect-error - report without messageId
    message: `Parse errors in imported module '${declaration.source.value}': ${msg}`,
  })
}
