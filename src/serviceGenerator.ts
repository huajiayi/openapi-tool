import fs from "fs";
import ejs from "ejs";
import { resolve } from "path";
import {
  getAllDeps,
  removeArraySign,
  removeGenericsSign,
  report,
  toGenerics,
  toGenericsTypes,
} from "./utils";
import { Spec2 } from "./swagger";

type In = "path" | "query" | "body" | "formdata";

interface Param {
  in?: In; // 变量所在位置
  name: string; // 参数名
  type: string; // 参数类型
  description: string; // 注释
  required: boolean; // 是否必须
}

interface API {
  tag: string; // openapi tag，可用作文件名
  name: string; // 函数名
  description: string; // 注释
  request: {
    url: string; // 源请求地址
    urlText: string; // 经过处理的Url字符串
    method: string; // 请求方法
    params: Param[]; // 参数
    // 过滤param
    filter: {
      path: Param[]; // path变量
      query: Param[]; // 请求参数
      body: Param[]; // 请求体
      formdata: Param[]; // formdata
    };
  };
  response: {
    type: string; // 响应类型
  };
}

interface Type {
  isGenerics: boolean; // 是否是泛型Type
  name: string; // 类型名
  description: string; // 注释
  params: Param[]; // 参数
}

const getType = (param?: any, hasGenerics?: boolean): string => {
  if (!param) {
    return "any";
  }

  const { type } = param;
  if (!type && param.originalRef) {
    return param.originalRef;
  }

  const numberEnum = [
    "int64",
    "integer",
    "long",
    "float",
    "double",
    "number",
    "int",
    "float",
    "double",
    "int32",
    "int64",
  ];
  const dateEnum = ["Date", "date", "dateTime", "date-time", "datetime"];
  const stringEnum = ["string", "email", "password", "url", "byte", "binary"];

  if (numberEnum.includes(type)) {
    return "number";
  }
  if (dateEnum.includes(type)) {
    return "string";
  }
  if (stringEnum.includes(type)) {
    return "string";
  }
  if (type === "boolean") {
    return "boolean";
  }
  if (type === "object") {
    return hasGenerics
      ? "T"
      : param.originalRef ?? param.additionalProperties?.type ?? "any";
  }
  if (type === "array") {
    return hasGenerics
      ? "T[]"
      : `${param.items.originalRef ?? getType(param.items)}[]`;
  }

  return "any";
};

const getParams = (parameters: any, definitions: any): Param[] => {
  if (!parameters || parameters.length === 0) {
    return [];
  }

  if (parameters[0]?.in === "body") {
    const originalRef = parameters?.[0]?.schema.originalRef;
    const properties = definitions[originalRef]?.properties;
    return Object.keys(properties).map((name: string) => {
      const parameter = properties[name];
      return {
        in: "body",
        name,
        type: getType(parameter, false),
        description: parameter.description,
        required: false,
      };
    });
  }

  return parameters.map((parameter: any) => {
    return {
      in: parameter.in,
      name: parameter.name,
      type: getType(parameter, false),
      description: parameter.description,
      required: parameter.required,
    };
  });
};

const getUrlText = (path: string) => {
  if (path.includes("{")) {
    return `\`${path.replace(/{/g, "${pathVars.")}\``;
  }

  return `\'${path}\'`;
};

const getApis = (data: any, types: Type[]): API[] => {
  const getResponseType = (responses: any, generics: string[]): string => {
    const res = responses["200"];
    if (res.schema?.type) {
      return getType(res.schema);
    }

    if (res.schema?.originalRef) {
      const type = res.schema?.originalRef?.replace(/«/g, "<").replace(/»/g, ">");
      const deps = getAllDeps(type);
      // 如果泛型Type没有内部泛型，填充一个<any>
      if (deps.length === 1 && generics.includes(type)) {
        return type + "<any>";
      }

      // 找出不包含在types中的依赖，设为any
      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      const typesWithoutSign = types.map(type => removeGenericsSign(type.name));
      for (let i = 0; i < deps.length; i++) {
        if(!typesWithoutSign.includes(deps[i])) {
          deps[i] = 'any';
        }
      }
      return toGenerics(deps);
    }

    return "any";
  };

  const apis: API[] = [];
  Object.keys(data.paths).forEach((path: string) => {
    const methods = data.paths[path];
    Object.keys(methods).forEach((method: string) => {
      const api = methods[method];
      const params = getParams(api.parameters, data.definitions);
      apis.push({
        tag: api.tags?.[0],
        name: api.operationId,
        description: api.summary,
        request: {
          url: path,
          urlText: getUrlText(path),
          method: method.toUpperCase(),
          params,
          filter: {
            path: params.filter((param) => param.in === "path"),
            query: params.filter((param) => param.in === "query"),
            body: params.filter((param) => param.in === "body"),
            formdata: params.filter((param) => param.in === "formdata"),
          },
        },
        response: {
          type: getResponseType(
            api.responses,
            types
              .filter((type) => type.isGenerics)
              .map((type) => removeGenericsSign(type.name))
          ),
        },
      });
    });
  });

  return apis;
};

const getTypeParams = (properties: any, hasGenerics: boolean): Param[] => {
  return Object.keys(properties).map((property) => {
    const param = properties[property];
    return {
      isGenerics: hasGenerics,
      name: property,
      type: getType(param, hasGenerics),
      description: param.description,
      required: false,
    };
  });
};

const getTypes = (data: Spec2) => {
  // 找出所有的泛型
  const definitions = data.definitions || {};
  const generics = new Set<string>();
  Object.keys(definitions).forEach((definition) => {
    const genericArr = definition.split("«");
    genericArr.pop();
    genericArr.forEach((g) => generics.add(g));
  });

  // 取出所有的类型
  const types: Type[] = [];
  Object.keys(definitions).forEach((definition) => {
    let defText = definition;
    const deps = getAllDeps(toGenericsTypes(definition));
    
    if(deps.length > 1) {
      defText = deps[0];
    }

    const def = definitions[definition];
    if (!def.properties) {
      return;
    }

    if(!types.some((type) => removeGenericsSign(type.name) === defText)) {
      const isGenerics =
      generics.has(defText);
      types.push({
        isGenerics,
        name: isGenerics ? `${defText}<T>` : defText,
        description: def.description || '',
        params: getTypeParams(def.properties, isGenerics),
      });
    }
  });

  return types;
};

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

const generateService = async (data: Spec2, outputDir: string) => {
  const types = getTypes(data);

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
  fs.writeFileSync(output, service);
  report(output, service);

  const apis = getApis(data, types);

  // 把api按tag分组
  const tagMap = new Map<string, API[]>();
  data.tags?.forEach((tag: any) => {
    tagMap.set(tag.name, []);
  });
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
