// import sinon from 'sinon';
import { testContext } from '../utils'

import {
  StronglyConnectedComponents,
  ExportMap,
  childContext as buildChildContext,
} from 'eslint-plugin-import-x/utils'

function exportMapFixtureBuilder(
  path: string,
  imports: ExportMap[],
): ExportMap {
  return {
    path,
    imports: new Map(
      imports.map(imp => [
        imp.path,
        { getter: () => imp, declarations: new Set() },
      ]),
    ),
  } as ExportMap
}

describe('Strongly Connected Components Builder', () => {
  afterEach(() => StronglyConnectedComponents.clearCache())

  describe('When getting an SCC', () => {
    const source = ''
    const ruleContext = testContext({})
    const childContext = buildChildContext(source, ruleContext)

    describe('Given two files', () => {
      describe("When they don't cycle", () => {
        it('Should return foreign SCCs', () => {
          jest
            .spyOn(ExportMap, 'for')
            .mockReturnValue(
              exportMapFixtureBuilder('foo.js', [
                exportMapFixtureBuilder('bar.js', []),
              ]),
            )
          const actual = StronglyConnectedComponents.for(childContext)
          expect(actual).toEqual({ 'foo.js': 1, 'bar.js': 0 })
        })
      })

      describe.skip('When they do cycle', () => {
        it('Should return same SCC', () => {
          jest
            .spyOn(ExportMap, 'for')
            .mockReturnValue(
              exportMapFixtureBuilder('foo.js', [
                exportMapFixtureBuilder('bar.js', [
                  exportMapFixtureBuilder('foo.js', []),
                ]),
              ]),
            )
          const actual = StronglyConnectedComponents.get(source, ruleContext)
          expect(actual).toEqual({ 'foo.js': 0, 'bar.js': 0 })
        })
      })
    })

    describe('Given three files', () => {
      describe('When they form a line', () => {
        describe('When A -> B -> C', () => {
          it('Should return foreign SCCs', () => {
            jest
              .spyOn(ExportMap, 'for')
              .mockReturnValue(
                exportMapFixtureBuilder('foo.js', [
                  exportMapFixtureBuilder('bar.js', [
                    exportMapFixtureBuilder('buzz.js', []),
                  ]),
                ]),
              )
            const actual = StronglyConnectedComponents.for(childContext)
            expect(actual).toEqual({ 'foo.js': 2, 'bar.js': 1, 'buzz.js': 0 })
          })
        })

        describe('When A -> B <-> C', () => {
          it('Should return 2 SCCs, A on its own', () => {
            jest
              .spyOn(ExportMap, 'for')
              .mockReturnValue(
                exportMapFixtureBuilder('foo.js', [
                  exportMapFixtureBuilder('bar.js', [
                    exportMapFixtureBuilder('buzz.js', [
                      exportMapFixtureBuilder('bar.js', []),
                    ]),
                  ]),
                ]),
              )
            const actual = StronglyConnectedComponents.for(childContext)
            expect(actual).toEqual({ 'foo.js': 1, 'bar.js': 0, 'buzz.js': 0 })
          })
        })

        describe('When A <-> B -> C', () => {
          it('Should return 2 SCCs, C on its own', () => {
            jest
              .spyOn(ExportMap, 'for')
              .mockReturnValue(
                exportMapFixtureBuilder('foo.js', [
                  exportMapFixtureBuilder('bar.js', [
                    exportMapFixtureBuilder('buzz.js', []),
                    exportMapFixtureBuilder('foo.js', []),
                  ]),
                ]),
              )
            const actual = StronglyConnectedComponents.for(childContext)
            expect(actual).toEqual({ 'foo.js': 1, 'bar.js': 1, 'buzz.js': 0 })
          })
        })

        describe('When A <-> B <-> C', () => {
          it('Should return same SCC', () => {
            jest
              .spyOn(ExportMap, 'for')
              .mockReturnValue(
                exportMapFixtureBuilder('foo.js', [
                  exportMapFixtureBuilder('bar.js', [
                    exportMapFixtureBuilder('foo.js', []),
                    exportMapFixtureBuilder('buzz.js', [
                      exportMapFixtureBuilder('bar.js', []),
                    ]),
                  ]),
                ]),
              )
            const actual = StronglyConnectedComponents.for(childContext)
            expect(actual).toEqual({ 'foo.js': 0, 'bar.js': 0, 'buzz.js': 0 })
          })
        })
      })

      describe('When they form a loop', () => {
        it('Should return same SCC', () => {
          jest
            .spyOn(ExportMap, 'for')
            .mockReturnValue(
              exportMapFixtureBuilder('foo.js', [
                exportMapFixtureBuilder('bar.js', [
                  exportMapFixtureBuilder('buzz.js', [
                    exportMapFixtureBuilder('foo.js', []),
                  ]),
                ]),
              ]),
            )
          const actual = StronglyConnectedComponents.for(childContext)
          expect(actual).toEqual({ 'foo.js': 0, 'bar.js': 0, 'buzz.js': 0 })
        })
      })

      describe('When they form a Y', () => {
        it('Should return 3 distinct SCCs', () => {
          jest
            .spyOn(ExportMap, 'for')
            .mockReturnValue(
              exportMapFixtureBuilder('foo.js', [
                exportMapFixtureBuilder('bar.js', []),
                exportMapFixtureBuilder('buzz.js', []),
              ]),
            )
          const actual = StronglyConnectedComponents.for(childContext)
          expect(actual).toEqual({ 'foo.js': 2, 'bar.js': 0, 'buzz.js': 1 })
        })
      })

      describe('When they form a Mercedes', () => {
        it('Should return 1 SCC', () => {
          jest
            .spyOn(ExportMap, 'for')
            .mockReturnValue(
              exportMapFixtureBuilder('foo.js', [
                exportMapFixtureBuilder('bar.js', [
                  exportMapFixtureBuilder('foo.js', []),
                  exportMapFixtureBuilder('buzz.js', []),
                ]),
                exportMapFixtureBuilder('buzz.js', [
                  exportMapFixtureBuilder('foo.js', []),
                  exportMapFixtureBuilder('bar.js', []),
                ]),
              ]),
            )
          const actual = StronglyConnectedComponents.for(childContext)
          expect(actual).toEqual({ 'foo.js': 0, 'bar.js': 0, 'buzz.js': 0 })
        })
      })
    })
  })
})
