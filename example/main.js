const OpenApiTool = require('openapi-tool');
const { resolve } = require('path');

const url = 'http://localhost:11001/api/v1/v3/api-docs';
const outputDir = resolve(__dirname, '../', 'src', 'service');

const firstUpperCase = (str) => {
  let tmp = str.toLowerCase();
  tmp = tmp.charAt(0).toUpperCase() + tmp.slice(1);
  return tmp;
}

const formatTag = (url) => {
  const urlWords = url.split('-');
  const firstWord = urlWords.slice(0, 1);
  const restWords = urlWords.slice(1, -1).map(firstUpperCase).join('')
  return firstWord + restWords + 'Service';
}

const hasChinese = (str) => {
  for (let i = 0; i < str.length; i++) {
    // 判断字符的 Unicode 编码是否在 [\u4e00-\u9fa5] 的范围内
    if (str.charCodeAt(i) >= 0x4e00 && str.charCodeAt(i) <= 0x9fa5) {
      return true;
    }
  }
  return false;
}

const hasId = (str) => {
  return str.indexOf('id') !== -1 || str.indexOf('Id') !== -1
}

const openApiTool = new OpenApiTool({url});
openApiTool.generateService({
  template: 'umi-request',
  importText: `import { request } from 'umi';`,
  typescript: true,
  outputDir,
  format: (openapi) => {
    openapi.apis.forEach(o => {
      // 格式化文件名
      o.tag = formatTag(o.tag);
      // 格式化方法名
      o.name = o.name
        .replace('UsingGET', '')
        .replace('UsingPOST', '')
        .replace('UsingPUT', '')
        .replace('UsingDELETE', '')
        .split('_')[0];
      o.request.filter.path.forEach(param => {
        if (hasId(param.name)) {
          param.type = param.type.replace('number', 'string')
        }
      })
      o.request.filter.query.forEach(param => {
        if (hasId(param.name)) {
          param.type = param.type.replace('number', 'string')
        }
      })
      o.request.filter.body.params.forEach(param => {
        if (hasId(param.name)) {
          param.type = param.type.replace('number', 'string')
        }
      })
      o.request.filter.formdata.forEach(param => {
        if (hasId(param.name)) {
          param.type = param.type.replace('number', 'string')
        }
      })
    })
    openapi.apis = openapi.apis.filter(api => !hasChinese(api.tag))

    openapi.types.forEach(type => {
      type.params.forEach(param => {
        if (hasId(param.name)) {
          param.type = param.type.replace('number', 'string')
        }
      })
    })
    return openapi;
  }
});