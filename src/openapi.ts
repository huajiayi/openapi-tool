import {
  Definitions,
  Operation,
  Operation3,
  Parameter,
  Parameter2,
  Path,
  Path3,
  Properties,
  Schema,
  Schema3,
  Spec2,
  Spec3,
} from './swagger';
import {
  getAllDeps,
  getOriginalRef,
  removeGenericsSign,
  toGenerics,
  toGenericsTypes,
} from './utils';

export enum Version {
  OAS2,
  OAS3,
}

export interface Param {
  in?: string; // 变量所在位置
  name: string; // 参数名
  type: string; // 参数类型
  description: string; // 注释
  required: boolean; // 是否必须
}

export interface Body {
  arrayType: string; // 数组类型
  params: Param[]; // 参数
}

export interface API {
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
      body: Body; // 请求体
      formdata: Param[]; // formdata
    };
  };
  response: {
    type: string; // 响应类型
  };
}

export interface Type {
  isGenerics: boolean; // 是否是泛型Type
  name: string; // 类型名
  description: string; // 注释
  params: Param[]; // 参数
}

export interface OpenApi {
  types: Type[]; // 类型
  apis: API[]; // 接口
}

const getEnumType = (enums: string[]) => {
  return `(${enums.map(e => `'${e}'`).join(' | ')})`;
}

const getType = (param?: any, hasGenerics?: boolean): string => {
  if (!param) {
    return 'any';
  }

  if (param.schema) {
    let type = getType(param.schema);
    if (param.explode) {
      type += '[]';
    }
    return type;
  }
  

  const originalRef = getOriginalRef(param.$ref);
  const { type } = param;
  if (!type && originalRef) {
    if (hasGenerics) {
      return 'T';
    }

    return toGenericsTypes(originalRef);
  }

  const numberEnum = [
    'int64',
    'integer',
    'long',
    'float',
    'double',
    'number',
    'int',
    'float',
    'double',
    'int32',
    'int64',
  ];
  const dateEnum = ['Date', 'date', 'dateTime', 'date-time', 'datetime'];
  const stringEnum = ['string', 'email', 'password', 'url', 'byte', 'binary'];

  if (numberEnum.includes(type)) {
    return 'number';
  }
  if (dateEnum.includes(type)) {
    return 'string';
  }
  if (stringEnum.includes(type)) {
    if (param.enum) {
      return getEnumType(param.enum);
    }
    return 'string';
  }
  if (type === 'boolean') {
    return 'boolean';
  }
  if (type === 'object') {   
    return hasGenerics ? 'T' : param.originalRef ?? 'any';
  }
  if (type === 'array') {
    return hasGenerics
      ? 'T[]'
      : `${getOriginalRef(param.items.originalRef) !== '' || getType(param.items)}[]`;
  }

  return 'any';
};

const parseBodyProperties = (properties: Properties): Param[] => {
  return Object.keys(properties).map((name: string) => {
    const parameter = properties[name];
    return {
      in: 'body',
      name,
      type: getType(parameter, false),
      description: parameter.description ?? '',
      required: false,
    };
  });
};

const parseFormDataProperties = (properties: Properties): Param[] => {
  // 兼容properties为空的模式.
  if (!properties) {
    return []
  }
  return Object.keys(properties).map((name: string) => {
    const parameter = properties[name];
    return {
      in: 'formdata',
      name,
      type: getType(parameter, false),
      description: parameter.description ?? '',
      required: false,
    };
  });
};

const getParams = (
  definitions: Definitions,
  parameters?: Parameter[] | Parameter2[]
): Param[] => {
  if (!parameters || parameters.length === 0) {
    return [];
  }

  if (parameters[0]?.in === 'body') {
    const originalRef = getOriginalRef(parameters?.[0]?.schema.$ref);
    const properties = definitions[originalRef]?.properties;

    if (!properties) {
      return [
        {
          in: 'body',
          name: parameters[0].name,
          type: 'any',
          description: parameters[0].description ?? '',
          required: false,
        },
      ];
    }

    return parseBodyProperties(properties);
  }

  return parameters.map((parameter) => {
    return {
      in: parameter.in,
      name: parameter.name,
      type: getType(parameter, false),
      description: parameter.description ?? '',
      required: parameter.required ?? false,
    };
  });
};

const getUrlText = (path: string) => {
  if (path.includes('{')) {
    return `${path.replace(/{/g, '${pathVars.')}`;
  }

  return `${path}`;
};

const getApis = (
  data: { [name: string]: Path } | { [name: string]: Path3 },
  definitions: Definitions,
  types: Type[],
  version: Version
): API[] => {
  const getResponseType = (schema?: Schema, generics?: string[]): string => {
    if (schema?.type) {
      return getType(schema);
    }

    const originalRef = getOriginalRef(schema?.$ref);
    if (originalRef) {
      const type = originalRef?.replace(/«/g, '<').replace(/»/g, '>');
      const deps = getAllDeps(type);
      
      // 如果泛型Type没有内部泛型，填充一个<any>
      if (deps.length <= 1 && generics?.includes(type ?? '')) {
        return type + '<any>';
      }

      // 找出不包含在types中的依赖，设为any
      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      const typesWithoutSign = types.map((type) =>
        removeGenericsSign(type.name)
      );
      // TODO Java类型转换成Ts类型，将来有可能要增加类型
      const depMap = new Map();
      depMap.set('List', 'Array');
      for (let i = 0; i < deps.length; i++) {
        if(depMap.has(deps[i])) {
          deps[i] = depMap.get(deps[i]);
          continue;
        }

        if (!typesWithoutSign.includes(deps[i])) {
          deps[i] = 'any';
        }
      }
      
      return toGenerics(deps);
    }

    return 'any';
  };

  const apis: API[] = [];
  const parseOperation = (
    path: string,
    method: string,
    api?: Operation | Operation3
  ) => {
    const params = getParams(definitions, api?.parameters);
    const body: Body = {
      arrayType: '',
      params: []
    };
    let schema: Schema | Schema3 | undefined;
    if (version === Version.OAS2) {
      schema = ((api as Operation)?.responses?.['200'] ?? (api as Operation)?.responses?.['201']).schema;
    } else {
      const content = ((api as Operation3)?.responses?.['200'] ?? (api as Operation3)?.responses?.['201']).content ?? {};
      const firstProp = Object.keys(content)[0];
      schema = content[firstProp].schema;

      const parseRequestBody = (requestBody: any) => {
        const content = requestBody.content;
        const firstProp = Object.keys(content)[0];
        const schema = content[firstProp].schema;
        if (firstProp === 'multipart/form-data') {
          parseFormDataProperties(schema.properties).forEach((param) => params.push(param));
          return;
        }

        if (schema.type === 'array') {
          body.arrayType = getType(schema.items)
          return;
        }

        const originalRef = getOriginalRef(schema.$ref);
        const properties = definitions[originalRef]?.properties;
        if (properties) {
          parseBodyProperties(properties).forEach((param) => body.params.push(param));
          return;
        }

        body.params.push({
          in: 'body',
          name: 'unknownParam',
          type: 'any',
          description: '',
          required: false,
        });
      }
      
      if (api?.requestBody) {
        parseRequestBody(api?.requestBody);
      }
    }

    apis.push({
      tag: api?.tags?.[0] ?? '',
      name: api?.operationId ?? '',
      description: api?.summary ?? '',
      request: {
        url: path,
        urlText: getUrlText(path),
        method: method.toUpperCase(),
        params,
        filter: {
          path: params.filter((param) => param.in === 'path'),
          query: params.filter((param) => param.in === 'query'),
          body: body,
          formdata: params.filter((param) => param.in === 'formdata'),
        },
      },
      response: {
        type: getResponseType(
          schema,
          types
            .filter((type) => type.isGenerics)
            .map((type) => removeGenericsSign(type.name))
        ),
      },
    });
  };

  Object.keys(data).forEach((path: string) => {
    const methods = data[path];
    if(methods.get) {
      parseOperation(path, 'get', methods.get);
    }
    if(methods.post) {
      parseOperation(path, 'post', methods.post);
    }
    if(methods.put) {
      parseOperation(path, 'put', methods.put);
    }
    if(methods.delete) {
      parseOperation(path, 'delete', methods.delete);
    }
  });

  return apis;
};

const getTypeParams = (properties: Properties, hasGenerics: boolean, lastDep: string): Param[] => {
  return Object.keys(properties).map((property) => {
    const param = properties[property];
    const $ref = param.items?.$ref ?? param.$ref;
    let type = getType(param, hasGenerics)
    if (type === 'T' && !$ref?.includes(lastDep)) {
      type = getOriginalRef($ref);
    }

    return {
      isGenerics: hasGenerics,
      name: property,
      type,
      description: param.description ?? '',
      required: false,
    };
  });
};

const getTypes = (definitions: Definitions): Type[] => {
  // 找出所有的泛型
  const generics = new Set<string>();
  Object.keys(definitions).forEach((definition) => {
    const genericArr = definition.split('«');
    genericArr.pop();
    genericArr.forEach((g) => generics.add(g));
  });

  // 取出所有的类型
  const types: Type[] = [];
  Object.keys(definitions).forEach((definition) => {
    let defText = definition;
    const deps = getAllDeps(toGenericsTypes(definition));

    if (deps.length > 1) {
      defText = deps[0];
    }

    const def = definitions[definition];
    if (!def.properties) {
      return;
    }

    if (!types.some((type) => removeGenericsSign(type.name) === defText)) {
      const isGenerics = generics.has(defText);
      types.push({
        isGenerics,
        name: isGenerics ? `${defText}<T>` : defText,
        description: def.description ?? '',
        params: getTypeParams(def.properties, isGenerics, deps[deps.length - 1]),
      });
    }
  });

  return types;
};

export const spec2ToOpenApi = (data: Spec2): OpenApi => {
  const definitions = data.definitions ?? {};
  const types = getTypes(definitions ?? {});
  const apis = getApis(data.paths, definitions, types, Version.OAS2);

  return { types, apis };
};

export const spec3ToOpenApi = (data: Spec3): OpenApi => {
  const definitions = data.components.schemas ?? {};
  const types = getTypes(data.components.schemas ?? {});
  const apis = getApis(data.paths, definitions, types, Version.OAS3);

  return { types, apis };
};

export const getOpenApi = (data: any): OpenApi => {
  if (data.swagger === '2.0') {
    return spec2ToOpenApi(data);
  } else {
    return spec3ToOpenApi(data);
  }
};
