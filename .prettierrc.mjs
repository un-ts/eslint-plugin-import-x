import baseConfig from '@1stg/prettier-config'

export default {
  ...baseConfig,
  overrides: [
    ...baseConfig.overrides,
    {
      files: ['**/*.js'],
      options: {
        parser: 'babel-flow',
      },
    },
  ],
}
