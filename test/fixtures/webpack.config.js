module.exports = {
  resolve: {
    extensions: ['', '.js', '.jsx'],
    root: __dirname,
    alias: {
      'alias/jest$': 'jest', // alias for no-extraneous-dependencies tests
      'alias/esm-package': 'esm-package', // alias for no-extraneous-dependencies tests
    },
  },
}
