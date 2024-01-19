/**
 * @type {import('@babel/core').TransformOptions}
 */
module.exports = {
  presets: [
    [
      '@1stg',
      {
        modules: 'commonjs',
      },
    ],
  ],
  plugins: ['@babel/proposal-export-default-from'],
  overrides: [
    {
      test: './test/fixtures/jsx.js',
      presets: ['@babel/react'],
    },
  ],
}
