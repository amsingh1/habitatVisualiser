// eslint-config-next 16 ships a native flat config. The previous FlatCompat
// wrapper crashed on ESLint 9 ("Converting circular structure to JSON"), which
// left linting broken entirely.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**', 'public/**'],
  },
  ...nextCoreWebVitals,
];

export default eslintConfig;
