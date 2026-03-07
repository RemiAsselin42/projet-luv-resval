module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: false,
    },
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // TypeScript rules
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-var-requires': 'off',

    // General rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    semi: ['error', 'always'],
    quotes: ['error', 'single', { avoidEscape: true }],
    indent: ['error', 2, { SwitchCase: 1 }],
    'comma-dangle': ['error', 'always-multiline'],
    'eol-last': ['error', 'always'],
    'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: [
              '*.ts',
              '*.tsx',
              './*.ts',
              './*.tsx',
              '../*.ts',
              '../*.tsx',
              '**/*.ts',
              '**/*.tsx',
            ],
            message: 'Utiliser des imports sans extension TypeScript.',
          },
        ],
      },
    ],
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.config.js', 'vite.config.js'],
  overrides: [
    {
      files: ['*.js', '*.mjs'],
      parser: 'espree',
    },
  ],
};
