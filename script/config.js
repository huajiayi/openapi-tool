const path = require('path')
const typescript = require('rollup-plugin-typescript2')
const { eslint } = require('rollup-plugin-eslint')

const resolve = p => path.resolve(__dirname, '../', p)

const builds = {
  'full-dev': {
    input: resolve('src/main.ts'),
    output: resolve('dist/main.js'),
    format: 'cjs'
  },
  'full-prod': {
    input: resolve('src/main.ts'),
    output: resolve('dist/main.esm.js'),
    format: 'es'
  }
}

function getConfig(name) {
  const opt = builds[name]
  const config = {
    input: opt.input,
    output: {
      file: opt.output,
      format: opt.format,
      exports: 'auto',
      name: 'openapi-tool'
    },
    plugins: [
      eslint({
        fix: true
      }),
      typescript({
        tsconfig: resolve('./tsconfig.json'), // 导入本地ts配置
      })
    ],
    external: ['umi-request', 'fs', 'ejs', 'path']
  }

  return config
}

function getAllConfig() {
  return Object.keys(builds).map(getConfig)
}

exports.config = getConfig
exports.getAllConfig = getAllConfig
