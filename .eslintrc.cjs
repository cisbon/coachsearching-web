module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  ignorePatterns: ['js/vendor/**', 'node_modules/**', 'dist/**'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['react', 'react-hooks'],
  settings: {
    react: {
      version: '18.3',
    },
  },
  globals: {
    React: 'readonly',
    ReactDOM: 'readonly',
    supabase: 'readonly',
    htm: 'readonly',
  },
  rules: {
    // React Rules
    'react/prop-types': 'off', // Using JSDoc for types
    'react/no-unknown-property': ['error', { ignore: ['class', 'for'] }],
    'react/jsx-no-target-blank': 'error',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // General Best Practices
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    'curly': ['error', 'multi-line'],
    'no-throw-literal': 'error',

    // Security
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',

    // Code Quality
    'no-duplicate-imports': 'error',
    'no-useless-concat': 'error',
    'prefer-template': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-spread': 'error',
    'prefer-rest-params': 'error',
    'no-param-reassign': ['error', { props: false }],
    'no-nested-ternary': 'warn',
    'max-depth': ['warn', 4],
    'complexity': ['warn', 20],
  },
};
