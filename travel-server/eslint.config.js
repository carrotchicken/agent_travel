import js from '@eslint/js'

export default [
  js.configs.recommended,
  {
    ignores: ['node_modules/**']
  },
  {
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'warn',
      'indent': ['warn', 2],
      'quotes': ['warn', 'single'],
      'semi': ['warn', 'never']
    }
  }
]
