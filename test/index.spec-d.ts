import type { defineConfig } from 'eslint/config'
import { expectTypeOf } from 'expect-type'

import { flatConfigs } from 'eslint-plugin-import-x'

expectTypeOf(flatConfigs.electron).toMatchTypeOf<
  Parameters<typeof defineConfig>[0]
>()

expectTypeOf(flatConfigs.errors).toMatchTypeOf<
  Parameters<typeof defineConfig>[0]
>()

expectTypeOf(flatConfigs['stage-0']).toMatchTypeOf<
  Parameters<typeof defineConfig>[0]
>()

expectTypeOf(flatConfigs.react).toMatchTypeOf<
  Parameters<typeof defineConfig>[0]
>()

expectTypeOf(flatConfigs['react-native']).toMatchTypeOf<
  Parameters<typeof defineConfig>[0]
>()

expectTypeOf(flatConfigs.typescript).toMatchTypeOf<
  Parameters<typeof defineConfig>[0]
>()

expectTypeOf(flatConfigs.recommended).toMatchTypeOf<
  Parameters<typeof defineConfig>[0]
>()
