// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', 'functions/lib/**', '.agents/**', 'landing/**'],
    rules: { 'react/jsx-no-leaked-render': ['error', { validStrategies: ['coerce', 'ternary'] }] },
  },
]);
