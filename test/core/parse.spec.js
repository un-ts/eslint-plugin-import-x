import * as fs from 'fs'
import parse from '../../src/utils/parse'

import { getFilename } from '../utils'

describe('parse(content, { settings, ecmaFeatures })', () => {
  const path = getFilename('jsx.js')
  const parseStubParser = require('./parseStubParser')
  const parseStubParserPath = require.resolve('./parseStubParser')
  const eslintParser = require('./eslintParser')
  const eslintParserPath = require.resolve('./eslintParser')
  let content

  beforeAll(done => {
    fs.readFile(path, { encoding: 'utf8' }, (err, f) => {
      if (err) {
        done(err)
      } else {
        content = f
        done()
      }
    })
  })

  it("doesn't support JSX by default", () => {
    expect(() => parse(path, content, { parserPath: 'espree' })).toThrow()
  })

  it('infers jsx from ecmaFeatures when using stock parser', () => {
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
    ).not.toThrow()
  })

  it('passes expected parserOptions to custom parser', () => {
    const parseSpy = jest.fn()
    const parserOptions = { ecmaFeatures: { jsx: true } }
    parseStubParser.parse = parseSpy
    parse(path, content, {
      settings: {},
      parserPath: parseStubParserPath,
      parserOptions,
    })
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
    expect(parseSpy.mock.calls[0][1]).toHaveProperty('filePath', path)
  })

  it('passes with custom `parseForESLint` parser', () => {
    const parseForESLintSpy = jest
      .spyOn(eslintParser, 'parseForESLint')
      .mockClear()
    const parseSpy = jest.fn()
    eslintParser.parse = parseSpy
    parse(path, content, { settings: {}, parserPath: eslintParserPath })
    // custom `parseForESLint` parser to be called once
    expect(parseForESLintSpy).toHaveBeenCalledTimes(1)
    // `parseForESLint` takes higher priority than `parse`
    expect(parseSpy).toHaveBeenCalledTimes(0)
  })

  it('throws on context == null', () => {
    expect(parse.bind(null, path, content, null)).toThrow()
  })

  it('throws on unable to resolve parserPath', () => {
    expect(
      parse.bind(null, path, content, { settings: {}, parserPath: null }),
    ).toThrow()
  })

  it('takes the alternate parser specified in settings', () => {
    const parseSpy = jest.fn()
    const parserOptions = { ecmaFeatures: { jsx: true } }
    parseStubParser.parse = parseSpy
    expect(
      parse.bind(null, path, content, {
        settings: { 'import-x/parsers': { [parseStubParserPath]: ['.js'] } },
        parserPath: null,
        parserOptions,
      }),
    ).not.toThrow()
    // custom parser to be called once
    expect(parseSpy).toHaveBeenCalledTimes(1)
  })

  it('throws on invalid languageOptions', () => {
    expect(
      parse.bind(null, path, content, {
        settings: {},
        parserPath: null,
        languageOptions: null,
      }),
    ).toThrow()
  })

  it('throws on non-object languageOptions.parser', () => {
    expect(
      parse.bind(null, path, content, {
        settings: {},
        parserPath: null,
        languageOptions: { parser: 'espree' },
      }),
    ).toThrow()
  })

  it('throws on null languageOptions.parser', () => {
    expect(
      parse.bind(null, path, content, {
        settings: {},
        parserPath: null,
        languageOptions: { parser: null },
      }),
    ).toThrow()
  })

  it('throws on empty languageOptions.parser', () => {
    expect(
      parse.bind(null, path, content, {
        settings: {},
        parserPath: null,
        languageOptions: { parser: {} },
      }),
    ).toThrow()
  })

  it('throws on non-function languageOptions.parser.parse', () => {
    expect(
      parse.bind(null, path, content, {
        settings: {},
        parserPath: null,
        languageOptions: { parser: { parse: 'espree' } },
      }),
    ).toThrow()
  })

  it('throws on non-function languageOptions.parser.parse', () => {
    expect(
      parse.bind(null, path, content, {
        settings: {},
        parserPath: null,
        languageOptions: { parser: { parseForESLint: 'espree' } },
      }),
    ).toThrow()
  })

  it('requires only one of the parse methods', () => {
    expect(
      parse.bind(null, path, content, {
        settings: {},
        parserPath: null,
        languageOptions: { parser: { parseForESLint: () => ({ ast: {} }) } },
      }),
    ).not.toThrow()
  })

  it('uses parse from languageOptions.parser', () => {
    const parseSpy = jest.fn()
    expect(
      parse.bind(null, path, content, {
        settings: {},
        languageOptions: { parser: { parse: parseSpy } },
      }),
    ).not.toThrow()
    // passed parser to be called once
    expect(parseSpy).toHaveBeenCalledTimes(1)
  })

  it('uses parseForESLint from languageOptions.parser', () => {
    const parseSpy = jest.fn(() => ({ ast: {} }))
    expect(
      parse.bind(null, path, content, {
        settings: {},
        languageOptions: { parser: { parseForESLint: parseSpy } },
      }),
    ).not.toThrow()
    // passed parser to be called once
    expect(parseSpy).toHaveBeenCalledTimes(1)
  })

  it('prefers parsers specified in the settings over languageOptions.parser', () => {
    const parseSpy = jest.fn()
    parseStubParser.parse = parseSpy
    expect(
      parse.bind(null, path, content, {
        settings: { 'import-x/parsers': { [parseStubParserPath]: ['.js'] } },
        parserPath: null,
        languageOptions: {
          parser: {
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
    ).not.toThrow()
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
    ).not.toThrow()
  })
})
