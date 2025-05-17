import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import unusedImports from "eslint-plugin-unused-imports";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "*.generated.*"
    ]
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      "prefer-const": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          "vars": "all",
          "varsIgnorePattern": "^_",
          "args": "after-used",
          "argsIgnorePattern": "^_"
        }
      ],
      "@next/next/no-img-element": "warn",
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/no-unsafe-function-type": "error",
      "@next/next/no-html-link-for-pages": "warn",
      "import/no-anonymous-default-export": "warn"
    }
  },
  {
    files: [
      "**/__tests__/**/*.ts",
      "**/__tests__/**/*.tsx",
      "**/*.test.ts",
      "**/*.test.tsx"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "off",
      "unused-imports/no-unused-vars": "off",
      "@next/next/no-img-element": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@next/next/no-html-link-for-pages": "off"
    }
  }
];

export default eslintConfig;
