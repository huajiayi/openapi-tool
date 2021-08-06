# openapi-tool

English | [简体中文](https://github.com/huajiayi/openapi-tool/blob/main/README_CN.md)

openapi-tool is a tool to generate service file based on openapi.

If you like it, please give me a star. Thanks a lot!

### Features

- Compatible with bath [OAS2](https://swagger.io/specification/v2/) and [OAS3](https://swagger.io/specification/)
- Support major HTTP Client([axios](https://github.com/axios/axios) and [umi-request](https://github.com/umijs/umi-request) so far)
- Support generating js or ts file
- Support type system when generate ts file
- Plugin system to add global-level functionality

### Install

```
npm install openapi-tool
```

### Example

#### note: CommonJS usage

In order to gain the TypeScript typings (for intellisense / autocomplete) while using CommonJS imports with `require()` use the following approach:

```js
const OpenApiTool = require('openapi-tool').default;
```

**PS: Typing `.default` is merely used to gain the TypeScript typings. Please remove `.default` when you launch the project, otherwise it will throw an error.**

#### Usage

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

Create a new `OpenApiTool` instance.

**Options:**

| Property | Description | Type | Default | required |
| ------ | ------ | ------ | ------ | ------ |
| url | The url of swagger document  | string | - | either url or data |
| data | The json of swagger document | string | - | either url or data |

#### `generateService(options: ServiceGeneratorOptions): void`

Generate service files, the name of file will be the tag's name.

**ServiceGeneratorOptions:**

| Property | Description | Type | Default | required |
| ------ | ------ | ------ | ------ | ------ |
| outputDir | Output directory  | string | - | true |
| template | HTTP client template which you want to generate  | string | `'umi-request'` | false |
| importText | Import statements  | string | `default statements` | false |
| typescript | Generate ts file and typings  | boolean | `false` | false |
| format | Format content of OpenApi  | (openapi: OpenApi) => OpenApi | - | false |

#### `getOpenApi(): Promise<OpenApi>`

Get OpenApi that transformed from OAS2/OAS3.

### Plugin

openapi-tool have a flexible plugin system which can add global-level functionality. 

#### Using Plugin

Use plugins by calling the `OpenApiTool.use()` global method. This has to be done before you start your app by calling `new OpenApiTool()`:

```js
// calls `MyPlugin.install(OpenApiTool)`
OpenApiTool.use(MyPlugin)

new OpenApiTool({
  //... options
})
```

You can optionally pass in some options:

```js
OpenApiTool.use(MyPlugin, { someOption: true })
```

#### Writing a plugin

A plugin should be a method. The method will be called with the `OpenApiTool` constructor as the first argument, along with possible options:

```js
const logPlugin = (OpenApiTool, option) => {
  OpenApiTool.prototype.log = async function() {
    const openapi = await this.getOpenApi();
    console.log(`the length of apis: ${openapi.apis.length}`);
    console.log('option', option);
  }
}
```

then you can use it like this:

```js
const openApiTool = new OpenApiTool({
  //... options
});
openApiTool.log();
```

### License

[MIT](https://github.com/huajiayi/openapi-tool/blob/main/LICENSE)