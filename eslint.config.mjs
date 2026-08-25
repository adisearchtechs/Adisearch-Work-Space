import { defineConfig, globalIgnores } from 'eslint/config';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
   ...nextCoreWebVitals,
   ...nextTypeScript,
   globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
   {
      // The inherited UI uses established controlled-component and drag/drop patterns.
      // Keep the correctness rules enabled while migrating React Compiler advisory rules incrementally.
      rules: {
         'react-hooks/purity': 'off',
         'react-hooks/refs': 'off',
         'react-hooks/set-state-in-effect': 'off',
         'react-hooks/use-memo': 'off',
      },
   },
   {
      // Vendored bazza/ui data-table-filter (kept close to upstream for easy updates)
      files: ['components/data-table-filter/**/*.{ts,tsx}'],
      rules: {
         '@typescript-eslint/no-unused-vars': 'off',
         '@typescript-eslint/no-explicit-any': 'off',
         '@typescript-eslint/no-this-alias': 'off',
         'react-hooks/rules-of-hooks': 'off',
         'react-hooks/exhaustive-deps': 'off',
      },
   },
]);

export default eslintConfig;
