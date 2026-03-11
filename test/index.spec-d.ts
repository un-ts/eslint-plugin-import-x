import type { defineConfig } from 'eslint/config'
import { expectTypeOf } from 'expect-type'

import plugin, { flatConfigs } from 'eslint-plugin-import-x'

describe('eslint-plugin-import-x exported types', () => {
  it('flatConfigs', () => {
    expectTypeOf(flatConfigs.electron).toExtend<
      Parameters<typeof defineConfig>[0]
    >()

    expectTypeOf(flatConfigs.errors).toExtend<
      Parameters<typeof defineConfig>[0]
    >()

    expectTypeOf(flatConfigs['stage-0']).toExtend<
      Parameters<typeof defineConfig>[0]
    >()

    expectTypeOf(flatConfigs.react).toExtend<
      Parameters<typeof defineConfig>[0]
    >()

    expectTypeOf(flatConfigs['react-native']).toExtend<
      Parameters<typeof defineConfig>[0]
    >()

    expectTypeOf(flatConfigs.typescript).toExtend<
      Parameters<typeof defineConfig>[0]
    >()

    expectTypeOf(flatConfigs.recommended).toExtend<
      Parameters<typeof defineConfig>[0]
    >()
  })

  it('plugin', () => {
    expectTypeOf({
      plugins: {
        'import-x': plugin,
      },
    }).toExtend<Parameters<typeof defineConfig>[0]>()
  })
})
