const globals = require('globals');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'scratch/**',
      'stitch-code.txt*',
      '**/*.bak',
      'dist/**'
    ]
  },
  {
    files: ['server.js', 'middleware/**/*.js', 'providers/**/*.js', 'utils/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-undef': 'error',
      'no-constant-condition': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }]
    }
  },
  {
    files: ['app.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'warn'
    }
  }
];
