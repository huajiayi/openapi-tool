import fs from "fs";
import ejs from "ejs";
import { resolve } from "path";
import {
  getAllDeps,
  removeArraySign,
  removeGenericsSign,
  report,
} from "./utils";
import { API, OpenApi } from "./openapi";

export type Template = 'umi-request' | 'axios';

export interface ServiceGeneratorOptions {
  template: Template;
  importText: string;
  outputDir: string;
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

const generateService = async (openapi: OpenApi, options: ServiceGeneratorOptions) => {
  const {template = 'umi-request', importText = '', outputDir} = options;
  if (!outputDir) {
    throw new Error("please input outputDir!");
  }

  const templates = ['umi-request', 'axios'];
  if(!templates.includes(template)) {
    throw new Error(`oops, there is no template of ${template} so far, you can open an issue at https://github.com/huajiayi/openapi-tool/issues.`);
  }

  const { types, apis } = openapi;

  // 写入type文件
  const filePath = resolve(
    __dirname, // 这里的__dirname指向dist
    "../",
    "src",
    "template",
    "type.ejs"
  );
  const service = await renderFile(filePath, { types });
  const output = resolve(outputDir, "typings.ts");
  if(!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  fs.writeFileSync(output, service);
  report(output, service);

  // 把api按tag分组
  const tagMap = new Map<string, API[]>();
  apis.forEach(api => {
    if(tagMap.has(api.tag)) {
      tagMap.get(api.tag)?.push(api)
    } else {
      tagMap.set(api.tag, []);
    }
  });

  // 写入service文件，tag为文件名
  tagMap.forEach(async (apis, tag) => {
    const filePath = resolve(
      __dirname, // 这里的__dirname指向dist
      "../",
      "src",
      "template",
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
    const service = await renderFile(filePath, { importText, deps, apis });
    const output = resolve(outputDir, `${tag}.ts`);
    fs.writeFileSync(output, service);
    report(output, service);
  });
};

export default generateService;
