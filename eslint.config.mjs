// @ts-check
import js from '@eslint/js';
import angular from 'angular-eslint';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      'dist/',
      'out-tsc/',
      '.angular/',
      'coverage/',
      '**/node_modules/',
      // Static HTML mockups that agents rebuild, not Angular templates.
      'evals/*/cases/',
      // Templates assembled from shared fragments (`${CONTENT}`), which the template parser cannot read.
      'projects/ngu-form/src/lib/components/ngu-sections.ts/**',
      'projects/ngu-form/src/lib/components/ngu-view.ts/**',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended, tseslint.configs.stylistic, angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      // Unused parameters document a callback's shape; a leading underscore marks the rest.
      '@typescript-eslint/no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      // Specs and type tests use empty classes and functions as fixtures.
      '@typescript-eslint/no-empty-function': 'off',
      // The spec types lean on `any` on purpose: it keeps contextual typing of `hidden: m => ...`
      // and friends working, and `DynamicField` JSON fits any model. tsc runs in strict mode.
      '@typescript-eslint/no-explicit-any': 'off',
      // Named index signatures document what the key is (`[path: string]`).
      '@typescript-eslint/consistent-indexed-object-style': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      // Objects handed to the form context read the component through `self`.
      '@typescript-eslint/no-this-alias': ['error', { allowedNames: ['self'] }],
    },
  },
  {
    files: ['projects/ngu-form/src/**/*.ts', 'projects/ngu-form/*/src/**/*.ts', 'projects/ngu-dropdown/src/**/*.ts', 'projects/ngu-table/src/**/*.ts'],
    ignores: ['**/*.spec.ts', '**/testing/**'],
    rules: {
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'ngu', style: 'kebab-case' }],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      // `!= null` checks for both null and undefined.
      '@angular-eslint/template/eqeqeq': ['error', { allowNullOrUndefined: true }],
    },
  },
  {
    files: ['**/*.mjs', '**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      // Node scripts; the browser names are used inside Playwright's page.evaluate callbacks.
      globals: Object.fromEntries(
        ['console', 'process', 'URL', 'fetch', 'setTimeout', 'clearTimeout', 'document', 'getComputedStyle', 'scrollY'].map(
          (name) => [name, 'readonly'],
        ),
      ),
    },
  },
);
