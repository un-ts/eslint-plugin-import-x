module.exports = {
  presets: [
    '@babel/flow',
    [
      '@1stg',
      {
        modules: 'commonjs',
        typescript: true,
      },
    ],
  ],
  plugins: ['@babel/proposal-export-default-from'],
  targets: {
    node: 'current',
  },
  overrides: [
    {
      test: './test/fixtures/jsx.js',
      presets: ['@babel/react'],
    },
  ],
}
