import fs from 'fs'
import { parse } from '../../src/utils/parse'

import { testFilePath } from '../utils'
import { ChildContext, PluginSettings, RuleContext } from '../../src/types'

import eslintParser from './eslint-parser'
import parseStubParser from './parse-stub-parser'

describe('parse(content, { settings, ecmaFeatures })', () => {
  const filepath = testFilePath('jsx.js')

  const parseStubParserPath = require.resolve('./parse-stub-parser')

  const eslintParserPath = require.resolve('./eslint-parser')

  const content = fs.readFileSync(filepath, 'utf8')

  it("doesn't support JSX by default", () => {
    expect(() =>
      parse(filepath, content, { parserPath: 'espree' } as ChildContext),
    ).toThrow()
  })

  it('infers jsx from ecmaFeatures when using stock parser', () => {
    expect(() =>
      parse(filepath, content, {
        settings: {},
        parserPath: 'espree',
        parserOptions: {
          ecmaVersion: 2015,
          sourceType: 'module',
          ecmaFeatures: { jsx: true },
        },
      } as ChildContext),
    ).not.toThrow()
  })

  it('passes expected parserOptions to custom parser', () => {
    const parseSpy = jest.fn()
    const parserOptions = { ecmaFeatures: { jsx: true } }
    parseStubParser.parse = parseSpy
    parse(filepath, content, {
      settings: {},
      parserPath: parseStubParserPath,
      parserOptions,
    } as ChildContext)
    // custom parser to be called once
    expect(parseSpy).toHaveBeenCalledTimes(1)
    // custom parser to get content as its first argument
    expect(parseSpy.mock.calls[0][0]).toBe(content)
    expect(parseSpy.mock.calls[0][1]).toBeInstanceOf(Object)
    // custom parser to clone the parserOptions object
    expect(parseSpy.mock.calls[0][1]).not.toBe(parserOptions)
    // custom parser to get ecmaFeatures in parserOptions which is a clone of ecmaFeatures passed in
    const mockParserOptions = parseSpy.mock.calls[0][1]
    expect(mockParserOptions).toHaveProperty('ecmaFeatures')
    expect(mockParserOptions.ecmaFeatures).toEqual(parserOptions.ecmaFeatures)
    expect(mockParserOptions.ecmaFeatures).not.toBe(parserOptions.ecmaFeatures)
    // custom parser to get parserOptions.attachComment equal to true
    expect(parseSpy.mock.calls[0][1]).toHaveProperty('attachComment', true)
    // custom parser to get parserOptions.tokens equal to true
    expect(parseSpy.mock.calls[0][1]).toHaveProperty('tokens', true)
    // custom parser to get parserOptions.range equal to true
    expect(parseSpy.mock.calls[0][1]).toHaveProperty('range', true)
    // custom parser to get parserOptions.filePath equal to the full path of the source file
    expect(parseSpy.mock.calls[0][1]).toHaveProperty('filePath', filepath)
  })

  it('passes with custom `parseForESLint` parser', () => {
    const parseForESLintSpy = jest
      .spyOn(eslintParser, 'parseForESLint')
      .mockClear()
    const parseSpy = jest.fn()
    Object.assign(eslintParser, { parse: parseSpy })
    parse(filepath, content, {
      settings: {},
      parserPath: eslintParserPath,
    } as ChildContext)
    // custom `parseForESLint` parser to be called once
    expect(parseForESLintSpy).toHaveBeenCalledTimes(1)
    // `parseForESLint` takes higher priority than `parse`
    expect(parseSpy).toHaveBeenCalledTimes(0)
  })

  it('throws on context == null', () => {
    expect(
      parse.bind(
        null,
        filepath,
        content,
        // @ts-expect-error - testing
        null,
      ),
    ).toThrow()
  })

  it('throws on unable to resolve parserPath', () => {
    expect(
      parse.bind(
        null,
        filepath,
        content,
        // @ts-expect-error - testing
        {
          settings: {},
          parserPath: null,
        },
      ),
    ).toThrow()
  })

  it('takes the alternate parser specified in settings', () => {
    jest.spyOn(parseStubParser, 'parse').mockClear()
    const parserOptions = { ecmaFeatures: { jsx: true } }
    expect(
      parse.bind(null, filepath, content, {
        settings: {
          'import-x/parsers': {
            [parseStubParserPath]: ['.js'] as const,
          },
          // FIXME: it seems a bug in TypeScript
        } as PluginSettings,
        parserPath: null,
        parserOptions,
      } as ChildContext),
    ).not.toThrow()
    // custom parser to be called once
    expect(parseStubParser.parse).toHaveBeenCalledTimes(1)
  })

  it('throws on invalid languageOptions', () => {
    expect(
      parse.bind(null, filepath, content, {
        settings: {},
        parserPath: null,
        // @ts-expect-error - testing
        languageOptions: null,
      }),
    ).toThrow()
  })

  it('throws on non-object languageOptions.parser', () => {
    expect(
      parse.bind(null, filepath, content, {
        settings: {},
        parserPath: null,
        languageOptions: {
          // @ts-expect-error - testing
          parser: 'espree',
        },
      }),
    ).toThrow()
  })

  it('throws on null languageOptions.parser', () => {
    expect(
      parse.bind(null, filepath, content, {
        settings: {},
        parserPath: null,
        languageOptions: {
          // @ts-expect-error - testing
          parser: null,
        },
      }),
    ).toThrow()
  })

  it('throws on empty languageOptions.parser', () => {
    expect(
      parse.bind(null, filepath, content, {
        settings: {},
        parserPath: null,
        languageOptions: {
          // @ts-expect-error - testing
          parser: {},
        },
      }),
    ).toThrow()
  })

  it('throws on non-function languageOptions.parser.parse', () => {
    expect(
      parse.bind(null, filepath, content, {
        settings: {},
        parserPath: null,
        languageOptions: {
          parser: {
            // @ts-expect-error - testing
            parse: 'espree',
          },
        },
      }),
    ).toThrow()
  })

  it('throws on non-function languageOptions.parser.parse', () => {
    expect(
      parse.bind(null, filepath, content, {
        settings: {},
        parserPath: null,
        languageOptions: {
          parser: {
            // @ts-expect-error - testing
            parseForESLint: 'espree',
          },
        },
      }),
    ).toThrow()
  })

  it('requires only one of the parse methods', () => {
    expect(
      parse.bind(null, filepath, content, {
        settings: {},
        parserPath: null,
        languageOptions: {
          parser: {
            parseForESLint: () => ({
              // @ts-expect-error - testing
              ast: {},
            }),
          },
        },
      }),
    ).not.toThrow()
  })

  it('uses parse from languageOptions.parser', () => {
    const parseSpy = jest.fn()
    expect(
      parse.bind(
        null,
        filepath,
        content,
        // @ts-expect-error - testing
        {
          settings: {},
          languageOptions: {
            parser: {
              parse: parseSpy,
            },
          },
        },
      ),
    ).not.toThrow()
    // passed parser to be called once
    expect(parseSpy).toHaveBeenCalledTimes(1)
  })

  it('uses parseForESLint from languageOptions.parser', () => {
    const parseSpy = jest.fn(() => ({ ast: {} }))
    expect(
      parse.bind(null, filepath, content, {
        settings: {},
        languageOptions: {
          parser: {
            // @ts-expect-error - testing
            parseForESLint: parseSpy,
          },
        },
      }),
    ).not.toThrow()
    // passed parser to be called once
    expect(parseSpy).toHaveBeenCalledTimes(1)
  })

  it('prefers parsers specified in the settings over languageOptions.parser', () => {
    const parseSpy = jest.fn()
    parseStubParser.parse = parseSpy
    expect(
      parse.bind(null, filepath, content, {
        settings: { 'import-x/parsers': { [parseStubParserPath]: ['.js'] } },
        parserPath: null,
        languageOptions: {
          parser: {
            // @ts-expect-error - testing
            parse() {
              //
            },
          },
        },
      }),
    ).not.toThrow()
    // custom parser to be called once
    expect(parseSpy).toHaveBeenCalledTimes(1)
  })

  it('ignores parser options from language options set to null', () => {
    const parseSpy = jest.fn()
    parseStubParser.parse = parseSpy
    expect(
      parse.bind(null, filepath, content, {
        settings: {},
        parserPath: 'espree',
        languageOptions: {
          // @ts-expect-error - testing
          parserOptions: null,
        },
        parserOptions: {
          sourceType: 'module',
          ecmaVersion: 2015,
          ecmaFeatures: { jsx: true },
        },
      }),
    ).not.toThrow()
  })

  it('prefers languageOptions.parserOptions over parserOptions', () => {
    const parseSpy = jest.fn()
    parseStubParser.parse = parseSpy
    expect(
      parse.bind(null, filepath, content, {
        settings: {},
        parserPath: 'espree',
        languageOptions: {
          parserOptions: {
            sourceType: 'module',
            ecmaVersion: 2015,
            ecmaFeatures: { jsx: true },
          },
        },
        parserOptions: {
          sourceType: 'script',
        },
      } as RuleContext),
    ).not.toThrow()
  })
})
