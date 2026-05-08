import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '**/.ipynb_checkpoints/**']),

  // Frontend: React + browser globals + no debug console.log in shipped code
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Cloudflare Workers: no React, service-worker/Node globals, console allowed
  {
    files: ['workers/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: { ...globals.serviceworker, ...globals.node },
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },

  // Vite/Tooling configs at the root
  {
    files: ['*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
])
