import path from 'node:path'

import { exec } from 'tinyexec'

describe('yarn pnp', () => {
  const yarnPnpDir = path.resolve('test/fixtures/yarn-pnp')
  const execOptions = { nodeOptions: { cwd: yarnPnpDir } }

  it('should just work', async () => {
    await exec('yarn', ['install', '--immutable'], execOptions)
    const result = await exec('yarn', ['lint'], execOptions)
    expect(result).toMatchSnapshot()
  }, 10_000)
})
