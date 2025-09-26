// @ts-check
import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default defineConfig([
  // Global ignores (keep simple directory-level patterns)
  {
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      '.nyc_output/',
      '.vscode/',
      '.idea/',
      '*.log',
    ],
  },

  // Lint JS files (configs, build scripts, etc.)
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    ...js.configs.recommended,
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // TypeScript: base recommended + type-checked rules, scoped to src
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],
  })),

  // TypeScript project + custom rules
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true, // uses nearest tsconfig.json
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node },
    },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      // Prefer TS-aware rule variants
      '@typescript-eslint/no-implied-eval': 'error',

      // TS rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-var-requires': 'off',

      // Strict type-safety (already covered by recommendedTypeChecked, but keep if you want the explicitness)
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-base-to-string': 'error',
      '@typescript-eslint/restrict-template-expressions': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // General JS rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-unused-expressions': 'error',
      'prefer-const': 'error',
      'no-var': 'error',

      // Best practices
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-eval': 'error',
      // replaced by TS-aware version above:
      'no-implied-eval': 'off',
      'no-new-func': 'error',

      // Modern async preferences (consider these defaults)
      'no-return-await': 'off',
      // If you keep it, prefer the TS version; otherwise off:
      '@typescript-eslint/require-await': 'off',
      'require-await': 'off',
    },
  },

  // Tests (relaxed, no project = no type-checking)
  {
    files: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
      globals: { ...globals.node, ...globals.jest }, // swap to globals.vitest if using Vitest
    },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      'no-console': 'off',
      'no-unused-expressions': 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },

  // Logger exception
  {
    files: ['src/**/logger.ts', 'src/**/logging.ts'],
    rules: { 'no-console': 'off' },
  },

  // Keep this last
  prettierConfig,
]);
