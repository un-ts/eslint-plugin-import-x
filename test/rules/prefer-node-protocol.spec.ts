import { TSESLint } from '@typescript-eslint/utils'

import { test } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-nodejs-modules'

const ruleTester = new TSESLint.RuleTester()

const error = (message: string) => ({
  message,
})

ruleTester.run('no-nodejs-modules', rule, {
  valid: [
    test({ code: 'import _ from "lodash"' }),
    test({ code: 'import find from "lodash.find"' }),
    test({ code: 'import foo from "./foo"' }),
    test({ code: 'import foo from "../foo"' }),
    test({ code: 'import foo from "foo"' }),
    test({ code: 'import foo from "./"' }),
    test({ code: 'import foo from "@scope/foo"' }),
    test({ code: 'var _ = require("lodash")' }),
    test({ code: 'var find = require("lodash.find")' }),
    test({ code: 'var foo = require("./foo")' }),
    test({ code: 'var foo = require("../foo")' }),
    test({ code: 'var foo = require("foo")' }),
    test({ code: 'var foo = require("./")' }),
    test({ code: 'var foo = require("@scope/foo")' }),
  ],
  invalid: [
    test({
      code: 'import path from "path"',
      errors: [error('Do not import Node.js builtin module "path"')],
    }),
    test({
      code: 'import { readFileSync } from "fs"',
      errors: [error('Do not import Node.js builtin module "fs"')],
    }),
    test({
      code: 'var path = require("path")',
      errors: [error('Do not import Node.js builtin module "path"')],
    }),
    test({
      code: 'var readFileSync = require("fs").readFileSync',
      errors: [error('Do not import Node.js builtin module "fs"')],
    }),
  ],
})
