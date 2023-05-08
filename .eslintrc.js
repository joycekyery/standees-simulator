module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  parserOptions: {
    parser: 'babel-eslint',
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  extends: [
    'plugin:react-hooks/recommended',
    'plugin:prettier/recommended',
    'react-app',
  ],
  plugins: ['prettier', 'react'],
  // add your custom rules here
  rules: {
    'react/prop-types': 1,
    'prettier/prettier': [
      'error',
      {
        printWidth: 80,
        semi: false,
        singleQuote: true,
      },
    ],
  },
}
