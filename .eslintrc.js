module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true,
  },
  extends: [
    'prettier',
    'airbnb-base',
  ],
  plugins: [
    'prettier'
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  ignorePatterns: [
    'lib/migrations/templates/defaultMigrationTemplate.js'
  ],
  rules: {
    'prettier/prettier': ['error', { 'singleQuote': true }],
    "comma-dangle": ["off", {}],
  },
};
