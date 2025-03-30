import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunctions } from '../utils.js'
import type { GetRuleModuleMessageIds } from '../utils.js'

import rule from 'eslint-plugin-import-x/rules/no-nodejs-modules'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

function createBuilinError(
  moduleName: string,
): TSESLintTestCaseError<GetRuleModuleMessageIds<typeof rule>> {
  return { messageId: 'builtin', data: { moduleName } }
}

ruleTester.run('no-nodejs-modules', rule, {
  valid: [
    tValid({ code: 'import _ from "lodash"' }),
    tValid({ code: 'import find from "lodash.find"' }),
    tValid({ code: 'import foo from "./foo"' }),
    tValid({ code: 'import foo from "../foo"' }),
    tValid({ code: 'import foo from "foo"' }),
    tValid({ code: 'import foo from "./"' }),
    tValid({ code: 'import foo from "@scope/foo"' }),
    tValid({ code: 'var _ = require("lodash")' }),
    tValid({ code: 'var find = require("lodash.find")' }),
    tValid({ code: 'var foo = require("./foo")' }),
    tValid({ code: 'var foo = require("../foo")' }),
    tValid({ code: 'var foo = require("foo")' }),
    tValid({ code: 'var foo = require("./")' }),
    tValid({ code: 'var foo = require("@scope/foo")' }),
    tValid({
      code: 'import events from "events"',
      options: [{ allow: ['events'] }],
    }),
    tValid({
      code: 'import path from "path"',
      options: [{ allow: ['path'] }],
    }),
    tValid({
      code: 'var events = require("events")',
      options: [{ allow: ['events'] }],
    }),
    tValid({
      code: 'var path = require("path")',
      options: [{ allow: ['path'] }],
    }),
    tValid({
      code: 'import path from "path";import events from "events"',
      options: [{ allow: ['path', 'events'] }],
    }),
    tValid({
      code: 'import events from "node:events"',
      options: [{ allow: ['node:events'] }],
    }),
    tValid({
      code: 'var events = require("node:events")',
      options: [{ allow: ['node:events'] }],
    }),
    tValid({
      code: 'import path from "node:path"',
      options: [{ allow: ['node:path'] }],
    }),
    tValid({
      code: 'var path = require("node:path")',
      options: [{ allow: ['node:path'] }],
    }),
    tValid({
      code: 'import path from "node:path";import events from "node:events"',
      options: [{ allow: ['node:path', 'node:events'] }],
    }),
  ],
  invalid: [
    tInvalid({
      code: 'import path from "path"',
      errors: [createBuilinError('path')],
    }),
    tInvalid({
      code: 'import fs from "fs"',
      errors: [createBuilinError('fs')],
    }),
    tInvalid({
      code: 'var path = require("path")',
      errors: [createBuilinError('path')],
    }),
    tInvalid({
      code: 'var fs = require("fs")',
      errors: [createBuilinError('fs')],
    }),
    tInvalid({
      code: 'import fs from "fs"',
      options: [{ allow: ['path'] }],
      errors: [createBuilinError('fs')],
    }),
    tInvalid({
      code: 'import path from "node:path"',
      errors: [createBuilinError('node:path')],
    }),
    tInvalid({
      code: 'var path = require("node:path")',
      errors: [createBuilinError('node:path')],
    }),
    tInvalid({
      code: 'import fs from "node:fs"',
      errors: [createBuilinError('node:fs')],
    }),
    tInvalid({
      code: 'var fs = require("node:fs")',
      errors: [createBuilinError('node:fs')],
    }),
    tInvalid({
      code: 'import fs from "node:fs"',
      options: [{ allow: ['node:path'] }],
      errors: [createBuilinError('node:fs')],
    }),
  ],
})
