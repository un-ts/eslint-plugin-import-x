module.exports = {
  resolve: {
    extensions: ['', '.js', '.jsx'],
    root: __dirname,
    alias: {
      'alias/vitest$': 'vitest', // alias for no-extraneous-dependencies tests
      'alias/esm-package': 'esm-package', // alias for no-extraneous-dependencies tests
    },
  },
}
