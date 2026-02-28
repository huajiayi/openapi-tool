const OpenApiTool = require('../dist/main');
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