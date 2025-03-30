import path from 'node:path'

import { exec } from 'tinyexec'

const TIMEOUT = 30_000

describe('yarn pnp', () => {
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
