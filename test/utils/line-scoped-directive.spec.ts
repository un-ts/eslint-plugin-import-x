import { isLineScopedDirective } from 'eslint-plugin-import-x/utils'

function comment(value: string, type: 'Block' | 'Line' = 'Line') {
  return isLineScopedDirective({ type, value } as never)
}

describe(isLineScopedDirective, () => {
  it('recognizes the plain and decorated directive forms', () => {
    expect(comment(' @ts-ignore')).toBe(true)
    expect(comment(' @ts-expect-error')).toBe(true)
    expect(comment(' eslint-disable-next-line')).toBe(true)
    expect(comment('* @ts-ignore ', 'Block')).toBe(true)
    expect(comment('/ @ts-ignore ', 'Block')).toBe(true)
    expect(comment('* eslint-disable-next-line ', 'Block')).toBe(true)
  })

  it('rejects comments that are not directives', () => {
    expect(comment(' plain')).toBe(false)
    expect(comment('* plain ', 'Block')).toBe(false)
  })
})
