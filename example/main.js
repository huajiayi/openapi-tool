const OpenApiTool = require('../dist/main');
const { resolve } = require('path');

const url = 'http://localhost:10001/api/v1/v3/api-docs';
const outputDir = resolve(__dirname, 'service');

const firstUpperCase = (str) => {
  let tmp = str.toLowerCase();
  tmp = tmp.charAt(0).toUpperCase() + tmp.slice(1);
  return tmp;
}

const formatUrl = (url) => {
  const urlWords = url.split('-');
  const firstWord = urlWords.slice(0, 1);
  const restWords = urlWords.slice(1, -1).map(firstUpperCase)
  return firstWord + restWords + 'Service';
}

const openApiTool = new OpenApiTool({url});
openApiTool.generateService({
  template: 'umi-request',
  importText: `import request from 'umi-request';`,
  typescript: true,
  outputDir,
  format: (openapi) => {
    openapi.apis.forEach(o => {
      o.tag = formatUrl(o.tag);
      o.name = o.name.replace('UsingGET', '').replace('UsingPOST', '').replace('UsingPUT', '').replace('UsingDELETE', '');
    })
    return openapi;
  }
});

