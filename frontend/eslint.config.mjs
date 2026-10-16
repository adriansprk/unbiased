import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import unusedImports from "eslint-plugin-unused-imports";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "next-env.d.ts",
      "*.generated.*"
    ]
  },
  ...nextVitals,
  ...nextTs,
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
