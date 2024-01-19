import fs from 'fs/promises'

import { getFilename } from '../utils'

import parse from 'eslint-module-utils/parse'

describe('parse(content, { settings, ecmaFeatures })', function () {
  const path = getFilename('jsx.js')
  const parseStubParser = require('./parseStubParser')
  const parseStubParserPath = require.resolve('./parseStubParser')
  const eslintParser = require('./eslintParser')
  const eslintParserPath = require.resolve('./eslintParser')

  let content

  beforeEach(async () => {
    content = await fs.readFile(path, { encoding: 'utf8' })
  })

  it("doesn't support JSX by default", function () {
    expect(() => parse(path, content, { parserPath: 'espree' })).toThrow(Error)
  })

  it('infers jsx from ecmaFeatures when using stock parser', function () {
    expect(() =>
      parse(path, content, {
        settings: {},
        parserPath: 'espree',
        parserOptions: {
          ecmaVersion: 2015,
          sourceType: 'module',
          ecmaFeatures: { jsx: true },
        },
      }),
    ).not.toThrow(Error)
  })

  it('passes expected parserOptions to custom parser', function () {
    const parseSpy = jest.fn()
    const parserOptions = { ecmaFeatures: { jsx: true } }
    parseStubParser.parse = parseSpy
    parse(path, content, {
      settings: {},
      parserPath: parseStubParserPath,
      parserOptions,
    })
    expect(
      parseSpy,
      // 'custom parser to be called once'
    ).toHaveBeenCalled(1)
    const [actualContent, ecmaFeatures] = parseSpy.args[0]
    expect(
      actualContent,
      // 'custom parser to get content as its first argument',
    ).toEqual(content)
    expect(
      ecmaFeatures,
      // 'custom parser to get an object as its second argument',
    ).toMatchObject()
    expect(
      ecmaFeatures,
      // 'custom parser to clone the parserOptions object',
    ).not.toEqual(parserOptions)
    expect(
      ecmaFeatures,
      // 'custom parser to get ecmaFeatures in parserOptions which is a clone of ecmaFeatures passed in',
    ).toEqual(parserOptions.ecmaFeatures)
    expect(ecmaFeatures).not.toBe(parserOptions.ecmaFeatures)
    expect(
      ecmaFeatures,
      // 'custom parser to get parserOptions.attachComment equal to true',
    ).toHaveProperty('attachComment', true)
    expect(
      ecmaFeatures,
      // 'custom parser to get parserOptions.tokens equal to true',
    ).toHaveProperty('tokens', true)
    expect(
      ecmaFeatures,
      // 'custom parser to get parserOptions.range equal to true',
    ).toHaveProperty('range', true)
    expect(
      ecmaFeatures,
      // 'custom parser to get parserOptions.filePath equal to the full path of the source file',
    ).toHaveProperty('filePath', path)
  })

  it('passes with custom `parseForESLint` parser', function () {
    const parseForESLintSpy = jest.spyOn(eslintParser, 'parseForESLint')
    const parseSpy = jest.fn()
    eslintParser.parse = parseSpy
    parse(path, content, { settings: {}, parserPath: eslintParserPath })
    expect(
      parseForESLintSpy,
      // 'custom `parseForESLint` parser to be called once',
    ).toHaveBeenCalled(1)
    expect(
      parseSpy,
      // '`parseForESLint` takes higher priority than `parse`',
    ).toHaveBeenCalled(0)
  })

  it('throws on context == null', function () {
    expect(parse.bind(null, path, content, null)).toThrow(Error)
  })

  it('throws on unable to resolve parserPath', function () {
    expect(
      parse.bind(null, path, content, { settings: {}, parserPath: null }),
    ).toThrow(Error)
  })

  it('takes the alternate parser specified in settings', function () {
    const parseSpy = jest.spyOn()
    const parserOptions = { ecmaFeatures: { jsx: true } }
    parseStubParser.parse = parseSpy
    expect(
      parse.bind(null, path, content, {
        settings: { 'i/parsers': { [parseStubParserPath]: ['.js'] } },
        parserPath: null,
        parserOptions,
      }),
    ).not.toThrow(Error)
    expect(
      parseSpy,
      // 'custom parser to be called once'
    ).toHaveBeenCalled(1)
  })

  it('throws on invalid languageOptions', function () {
    expect(
      parse.bind(null, path, content, {
        settings: {},
        parserPath: null,
        languageOptions: null,
      }),
    ).toThrow(Error)
  })

  it('throws on non-object languageOptions.parser', function () {
    expect(
      parse.bind(null, path, content, {
        settings: {},
        parserPath: null,
        languageOptions: { parser: 'espree' },
      }),
    ).toThrow(Error)
  })

  it('throws on null languageOptions.parser', function () {
    expect(
      parse.bind(null, path, content, {
        settings: {},
        parserPath: null,
        languageOptions: { parser: null },
      }),
    ).toThrow(Error)
  })

  it('throws on empty languageOptions.parser', function () {
    expect(
      parse.bind(null, path, content, {
        settings: {},
        parserPath: null,
        languageOptions: { parser: {} },
      }),
    ).toThrow(Error)
  })

  it('throws on non-function languageOptions.parser.parse', function () {
    expect(
      parse.bind(null, path, content, {
        settings: {},
        parserPath: null,
        languageOptions: { parser: { parse: 'espree' } },
      }),
    ).toThrow(Error)
  })

  it('throws on non-function languageOptions.parser.parseForESLint', function () {
    expect(
      parse.bind(null, path, content, {
        settings: {},
        parserPath: null,
        languageOptions: { parser: { parseForESLint: 'espree' } },
      }),
    ).toThrow(Error)
  })

  it('requires only one of the parse methods', function () {
    expect(
      parse.bind(null, path, content, {
        settings: {},
        parserPath: null,
        languageOptions: { parser: { parseForESLint: () => ({ ast: {} }) } },
      }),
    ).not.toThrow(Error)
  })

  it('uses parse from languageOptions.parser', function () {
    const parseSpy = jest.fn()
    expect(
      parse.bind(null, path, content, {
        settings: {},
        languageOptions: { parser: { parse: parseSpy } },
      }),
    ).not.toThrow(Error)
    expect(
      parseSpy,
      // 'passed parser to be called once'
    ).toHaveBeenCalled(1)
  })

  it('uses parseForESLint from languageOptions.parser', function () {
    const parseSpy = jest.fn(() => ({ ast: {} }))
    expect(
      parse.bind(null, path, content, {
        settings: {},
        languageOptions: { parser: { parseForESLint: parseSpy } },
      }),
    ).not.toThrow(Error)
    expect(
      parseSpy,
      // 'passed parser to be called once'
    ).toHaveBeenCalled(1)
  })

  it('prefers parsers specified in the settings over languageOptions.parser', () => {
    const parseSpy = jest.fn()
    parseStubParser.parse = parseSpy
    expect(
      parse.bind(null, path, content, {
        settings: { 'i/parsers': { [parseStubParserPath]: ['.js'] } },
        parserPath: null,
        languageOptions: { parser: { parse() {} } },
      }),
    ).not.toThrow(Error)
    expect(
      parseSpy,
      // 'custom parser to be called once'
    ).toHaveBeenCalled(1)
  })

  it('ignores parser options from language options set to null', () => {
    const parseSpy = jest.fn()
    parseStubParser.parse = parseSpy
    expect(
      parse.bind(null, path, content, {
        settings: {},
        parserPath: 'espree',
        languageOptions: { parserOptions: null },
        parserOptions: {
          sourceType: 'module',
          ecmaVersion: 2015,
          ecmaFeatures: { jsx: true },
        },
      }),
    ).not.toThrow(Error)
  })

  it('prefers languageOptions.parserOptions over parserOptions', () => {
    const parseSpy = jest.fn()
    parseStubParser.parse = parseSpy
    expect(
      parse.bind(null, path, content, {
        settings: {},
        parserPath: 'espree',
        languageOptions: {
          parserOptions: {
            sourceType: 'module',
            ecmaVersion: 2015,
            ecmaFeatures: { jsx: true },
          },
        },
        parserOptions: { sourceType: 'script' },
      }),
    ).not.toThrow(Error)
  })
})
