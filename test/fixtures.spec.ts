import path from 'node:path'

import { exec } from 'tinyexec'

import { testCompiled } from './utils.js'

const TIMEOUT = 60_000

;(testCompiled ? describe : describe.skip)('yarn pnp', () => {
  const yarnPnpDir = path.resolve('test/fixtures/yarn-pnp')
  const execOptions = { nodeOptions: { cwd: yarnPnpDir } }

  beforeAll(() => exec('yarn', ['--immutable'], execOptions), TIMEOUT)

  it(
    'should just work',
    async () => {
      const result = await exec('yarn', ['lint'], execOptions)
      expect(result).toMatchSnapshot()
    },
    TIMEOUT,
  )
})
