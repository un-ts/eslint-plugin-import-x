module.exports = {
  presets: [
    [
      '@babel/env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
    '@babel/flow',
    '@babel/react',
  ],
  plugins: [
    [
      '@babel/proposal-decorators',
      {
        version: 'legacy',
      },
    ],
    '@babel/proposal-export-default-from',
  ],
  sourceMaps: 'inline',
  retainLines: true,
  env: {
    test: {
      plugins: [['module-resolver', { root: ['./src/'] }]],
    },
    testCompiled: {
      plugins: [['module-resolver', { root: ['./lib/'] }]],
    },
  },
};
