import baseConfig from '@1stg/prettier-config'

export default {
  ...baseConfig,
  overrides: [
    {
      files: '*.js',
      parser: 'babel-flow',
    },
    {
      files: 'tsconfig.json',
      options: {
        trailingComma: 'none',
      },
    },
  ],
}
