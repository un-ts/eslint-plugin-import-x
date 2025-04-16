/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  presets: [
    [
      '@babel/env',
      {
        targets: {
          node: 12,
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
  overrides: [
    {
      include: '**/*.ts',
      presets: [
        [
          '@babel/typescript',
          {
            allowDeclareFields: true,
          },
        ],
      ],
    },
  ],
}
