import importPlugin, {
  configs,
  createNodeResolver,
} from 'eslint-plugin-import-x'

export default [
  { ignores: ['.yarn', '.pnp.*'] },
  {
    settings: {
      'import-x/resolver-next': [createNodeResolver()],
    },
    plugins: {
      'import-x': importPlugin,
    },
    rules: configs.recommended.rules,
  },
]
