const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,

  {
    files: ["**/*.js"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",

      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        Bun: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },

    rules: {
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      "no-undef": "error",
      "no-unreachable": "error",
    },
    
  },
{
  files: ["db/stores/*.js"],
  rules: {
    "no-unused-vars": "off",
  },
},
  {
    ignores: [
      "node_modules/**",
      "public/**",
      "data/**",
      "dist/**",
    ],
  },
];