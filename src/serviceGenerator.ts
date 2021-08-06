import fs from 'fs';
import ejs from 'ejs';
import { resolve } from 'path';
import {
  getAllDeps,
  removeArraySign,
  removeGenericsSign,
  report,
} from './utils';
import { API, OpenApi } from './openapi';

export type Template = 'umi-request' | 'axios';

export interface ServiceGeneratorOptions {
  template?: Template;
  importText?: string;
  outputDir: string;
  typescript?: boolean;
  format?: (openapi: OpenApi) => OpenApi;
}

const renderFile = (file: string, data: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    ejs.renderFile(file, data, {}, (err, str) => {
      if (err) {
        reject(err.message);
      }
      resolve(str);
    });
  });
};

const generateService = async (originalOpenApi: OpenApi, options: ServiceGeneratorOptions) => {
  const {template = 'umi-request', importText = '', outputDir, typescript = false} = options;
  if (!outputDir) {
    throw new Error('please input outputDir!');
  }

  const templates = ['umi-request', 'axios'];
  if(!templates.includes(template)) {
    throw new Error(`oops, there is no template of ${template} so far, you can open an issue at https://github.com/huajiayi/openapi-tool/issues.`);
  }

  // 如果有format，格式化openapi
  let openapi: OpenApi = JSON.parse(JSON.stringify(originalOpenApi));
  const {format} = options;
  if(format) {
    openapi = format(openapi);
  }
  const { types, apis } = openapi;

  // 生成type文件
  if(typescript) {
    const filePath = resolve(
      __dirname, // 这里的__dirname指向dist
      '../',
      'src',
      'template',
      'type.ejs'
    );
    const service = await renderFile(filePath, { types });
    const output = resolve(outputDir, 'typings.ts');
    if(!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    fs.writeFileSync(output, service);
    report(output, service);
  }

  // 把api按tag分组
  const tagMap = new Map<string, API[]>();
  apis.forEach(api => {
    if(!tagMap.has(api.tag)) {
      tagMap.set(api.tag, []);
    }
    tagMap.get(api.tag)?.push(api)
  });

  // 生成service文件，tag为文件名
  tagMap.forEach(async (apis, tag) => {
    const filePath = resolve(
      __dirname, // 这里的__dirname指向dist
      '../',
      'src',
      'template',
      `${template}.ejs`
    );
    // 找出所有依赖
    const deps = new Set<string>();
    apis.forEach((api) => {
      // 找出request中的依赖
      api.request.params.forEach((param) => {
        const dep = removeArraySign(param.type);
        if (types.some((type) => removeGenericsSign(type.name) === dep)) {
          deps.add(dep);
        }
      });
      // 找出response中的依赖
      getAllDeps(api.response.type).forEach((dep) => {
        if (types.some((type) => removeGenericsSign(type.name) === dep)) {
          deps.add(dep);
        }
      });
    });
    const service = await renderFile(filePath, { importText, deps, apis, typescript });
    const fileSuffix = typescript ? 'ts' : 'js';
    const output = resolve(outputDir, `${tag}.${fileSuffix}`);
    fs.writeFileSync(output, service);
    report(output, service);
  });
};

export default generateService;
