import fs from "fs";
import ejs from "ejs";
import { resolve } from "path";
import {
  getAllDeps,
  removeArraySign,
  removeGenericsSign,
  report,
} from "./utils";
import { API, getOpenApi } from "./openapi";

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

const generateService = async (data: any, outputDir: string) => {
  const openapi = getOpenApi(data);
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
  // 如果没有tag，从apis中获取
  if(!data.tags) {
    apis.forEach(api => tagMap.set(api.tag, []))
  } else {
    data.tags?.forEach((tag: any) => tagMap.set(tag.name, []));
  }
  apis.forEach((api) => tagMap.get(api.tag)?.push(api));

  // 写入service文件，tag为文件名
  tagMap.forEach(async (apis, tag) => {
    const filePath = resolve(
      __dirname, // 这里的__dirname指向dist
      "../",
      "src",
      "template",
      "umi-request.ejs"
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
    const service = await renderFile(filePath, { deps, apis });
    const output = resolve(outputDir, `${tag}.ts`);
    fs.writeFileSync(output, service);
    report(output, service);
  });
};

export default generateService;
