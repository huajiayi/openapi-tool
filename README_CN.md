# node-bittorrent

[English](https://github.com/huajiayi/openapi-tool) | 简体中文

openapi-tool 是一个基于 openapi 的工具，可以通过 swagger 文档自动生成前端 service 文件。

如果你喜欢这个项目，请给我一个 star。你的鼓励就是我最大的动力！

### 特性

- 同时兼容 [OAS2](https://swagger.io/specification/v2/) 和 [OAS3](https://swagger.io/specification/)
- 支持主流的HTTP客户端库(目前支持 [axios](https://github.com/axios/axios) 和 [umi-request](https://github.com/umijs/umi-request))
- 支持生成 js 文件或 ts 文件
- 生成 ts 文件时支持类型系统
- 可以增加全局功能的插件系统

### 安装

```
npm install openapi-tool
```

### 栗子

#### 注意：使用 CommonJS

为了获得 TypeScript 的类型支持，在使用 `require()` 语句导入依赖时，需要在后边加上 `.default`，像是这样：

```js
const OpenApiTool = require('openapi-tool').default;
```
**PS: 输入 `.default` 只是为了获得TypeScript 的类型支持，如果你要启动项目的话，请在启动前删除 `.default`，不然会报错。
**

#### 使用方式

```js
import OpenApiTool from 'openapi-tool';
const { resolve } = require('path');

const url = 'https://gw.alipayobjects.com/os/antfincdn/M%24jrzTTYJN/oneapi.json';
const outputDir = resolve(__dirname, 'service');

const openApiTool = new OpenApiTool({url});
openApiTool.generateService({
  template: 'axios',
  importText: `const axios = require('axios');`,
  typescript: true,
  outputDir,
});
```
### API

#### `new OpenApiTool(options: Options)`

创建一个 `OpenApiTool` 的实例.

**Options:**

| 参数 | 说明 | 类型 | 默认值 | 是否必须 |
| ------ | ------ | ------ | ------ | ------ |
| url | swagger 文档的地址  | string | - | url 或者 data 选填 |
| data | swagger 文档的 json 数据 | string | - | url 或者 data 选填 |

#### `generateService(options: ServiceGeneratorOptions): void`

生成 service 文件，文件名将会是 tag 的名称。

**ServiceGeneratorOptions:**

| 参数 | 说明 | 类型 | 默认值 | 是否必须 |
| ------ | ------ | ------ | ------ | ------ |
| outputDir | 输出目录  | string | - | true |
| template | 想要生成的 HTTP 客户端模板 | string | `'umi-request'` | false |
| importText | 导入依赖的语句  | string | `默认导入语句` | false |
| typescript | 是否生成 ts 文件和类型  | boolean | `false` | false |

#### `getOpenApi(): Promise<OpenApi>`

获得从OAS2/OAS3转换而来的OpenApi。

### 插件

openapi-tool 有一个灵活的插件系统，可以用来增加全局功能。

#### 使用插件

调用 `OpenApiTool.use()` 全局方法使用插件. 它需要在你调用 `new OpenApiTool()` 启动项目之前完成:

```js
// 调用 `MyPlugin.install(OpenApiTool)`
OpenApiTool.use(MyPlugin)

new OpenApiTool({
  //... options
})
```

也可以传入一个可选的选项对象:

```js
OpenApiTool.use(MyPlugin, { someOption: true })
```

#### 开发插件

OpenApiTool 的插件应该是一个方法. 这个方法的第一个参数是 `OpenApiTool` 构造器，第二个参数是一个可选的选项对象:

```js
const logPlugin = (OpenApiTool, option) => {
  OpenApiTool.prototype.log = async function() {
    const openapi = await this.getOpenApi();
    console.log(`总共有${openapi.apis.length}个api`);
    console.log('option', option);
  }
}
```

然后就可以这样使用他：

```js
const openApiTool = new OpenApiTool({
  //... options
});
openApiTool.log();
```

### 协议

[MIT](https://github.com/huajiayi/openapi-tool/blob/main/LICENSE)