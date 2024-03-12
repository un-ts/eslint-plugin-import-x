module.exports = {
  presets: [
    [
      '@babel/env',
      {
        targets: {
          node: 4,
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
}
