module.exports = {
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint-config-alloy/typescript"
  ],
  "rules": {
    // 一个缩进必须用两个空格替代
    "indent": [
      "error",
      2,
      {
        SwitchCase: 1,
        flatTernaryExpressions: true
      }
    ],
    // 一个缩进必须用两个空格替代
    "@typescript-eslint/indent": [
      "error",
      2,
      {
        SwitchCase: 1,
        flatTernaryExpressions: true
      }
    ]
  },
}