/* eslint-disable prettier/prettier */
module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true,
  },
  extends: ['airbnb-base', 'prettier'],
  plugins: ['prettier'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 2018,
  },
  ignorePatterns: ['lib/migrations/templates/defaultMigrationTemplate.js'],
  rules: {
    'prettier/prettier': ['error', { singleQuote: true }],
    'comma-dangle': ['off', {}],
    'no-underscore-dangle': 0,
    'no-param-reassign': 0,
    'no-return-assign': 0,
    'camelcase': 0,
  },
};
