import request from 'umi-request';
import path, { resolve } from 'path';
import fs from 'fs';
import ejs from 'ejs';

const getOriginalRef = (ref) => {
    if (!ref) {
        return '';
    }
    const strs = ref.split('/');
    return strs[strs.length - 1];
};
const getAllDeps = (type) => {
    if (!type) {
        return [];
    }
    return type.split('<').map(t => t.replace(/>/g, '').replace(/\[\]/g, ''));
};
const toGenericsTypes = (types) => {
    return types.replace(/«/g, '<').replace(/»/g, '>');
};
const toGenerics = (types) => {
    return types.length === 1 ? types[0] : `${types.join('<')}${types.slice(1).map(() => '>').join('')}`;
};
const removeGenericsSign = (type) => {
    return type.replace(/<T>/g, '');
};
const removeArraySign = (type) => {
    return type.replace(/\[\]/g, '');
};
const report = (dist, code) => {
    console.log(blue(path.relative(process.cwd(), dist)) + ' ' + getSize(code));
};
const getSize = (code) => {
    return (code.length / 1024).toFixed(2) + 'kb';
};
const blue = (str) => {
    return '\x1b[1m\x1b[34m' + str + '\x1b[39m\x1b[22m';
};
const isString = (obj) => {
    return Object.prototype.toString.call(obj) === '[object String]';
};

var Version;
(function (Version) {
    Version[Version["OAS2"] = 0] = "OAS2";
    Version[Version["OAS3"] = 1] = "OAS3";
})(Version || (Version = {}));
const getType = (param, hasGenerics) => {
    if (!param) {
        return 'any';
    }
    const originalRef = getOriginalRef(param.$ref);
    const { type } = param;
    if (!type && originalRef) {
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
            : `${getOriginalRef(param.items.originalRef) ?? getType(param.items)}[]`;
    }
    return 'any';
};
const parseProperties = (properties) => {
    return Object.keys(properties).map((name) => {
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
const getParams = (definitions, parameters) => {
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
        return parseProperties(properties);
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
const getUrlText = (path) => {
    if (path.includes('{')) {
        return `${path.replace(/{/g, '${pathVars.')}`;
    }
    return `${path}`;
};
const getApis = (data, definitions, types, version) => {
    const getResponseType = (schema, generics) => {
        if (schema?.type) {
            return getType(schema);
        }
        const originalRef = getOriginalRef(schema?.$ref);
        if (originalRef) {
            const type = originalRef?.replace(/«/g, '<').replace(/»/g, '>');
            const deps = getAllDeps(type);
            if (deps.length <= 1 && generics?.includes(type ?? '')) {
                return type + '<any>';
            }
            const typesWithoutSign = types.map((type) => removeGenericsSign(type.name));
            const depMap = new Map();
            depMap.set('List', 'Array');
            for (let i = 0; i < deps.length; i++) {
                if (depMap.has(deps[i])) {
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
    const apis = [];
    const parseOperation = (path, method, api) => {
        const params = getParams(definitions, api?.parameters);
        let schema;
        if (version === Version.OAS2) {
            schema = api?.responses?.['200'].schema;
        }
        else {
            const content = api?.responses?.['200'].content ?? {};
            const firstProp = Object.keys(content)[0];
            schema = content[firstProp].schema;
            if (api?.requestBody) {
                const content = api.requestBody.content;
                const firstProp = Object.keys(content)[0];
                const schema = content[firstProp].schema;
                const originalRef = getOriginalRef(schema.$ref);
                const properties = definitions[originalRef]?.properties;
                if (!properties) {
                    params.push({
                        in: 'body',
                        name: 'unknownParam',
                        type: 'any',
                        description: '',
                        required: false,
                    });
                }
                else {
                    parseProperties(properties).forEach((param) => params.push(param));
                }
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
                    body: params.filter((param) => param.in === 'body'),
                    formdata: params.filter((param) => param.in === 'formdata'),
                },
            },
            response: {
                type: getResponseType(schema, types
                    .filter((type) => type.isGenerics)
                    .map((type) => removeGenericsSign(type.name))),
            },
        });
    };
    Object.keys(data).forEach((path) => {
        const methods = data[path];
        if (methods.get) {
            parseOperation(path, 'get', methods.get);
        }
        if (methods.post) {
            parseOperation(path, 'post', methods.post);
        }
        if (methods.put) {
            parseOperation(path, 'put', methods.put);
        }
        if (methods.delete) {
            parseOperation(path, 'delete', methods.delete);
        }
    });
    return apis;
};
const getTypeParams = (properties, hasGenerics) => {
    return Object.keys(properties).map((property) => {
        const param = properties[property];
        return {
            isGenerics: hasGenerics,
            name: property,
            type: getType(param, hasGenerics),
            description: param.description ?? '',
            required: false,
        };
    });
};
const getTypes = (definitions) => {
    const generics = new Set();
    Object.keys(definitions).forEach((definition) => {
        const genericArr = definition.split('«');
        genericArr.pop();
        genericArr.forEach((g) => generics.add(g));
    });
    const types = [];
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
                params: getTypeParams(def.properties, isGenerics),
            });
        }
    });
    return types;
};
const spec2ToOpenApi = (data) => {
    const definitions = data.definitions ?? {};
    const types = getTypes(definitions ?? {});
    const apis = getApis(data.paths, definitions, types, Version.OAS2);
    return { types, apis };
};
const spec3ToOpenApi = (data) => {
    const definitions = data.components.schemas ?? {};
    const types = getTypes(data.components.schemas ?? {});
    const apis = getApis(data.paths, definitions, types, Version.OAS3);
    return { types, apis };
};
const getOpenApi = (data) => {
    if (data.swagger === '2.0') {
        return spec2ToOpenApi(data);
    }
    else {
        return spec3ToOpenApi(data);
    }
};

const renderFile = (file, data) => {
    return new Promise((resolve, reject) => {
        ejs.renderFile(file, data, {}, (err, str) => {
            if (err) {
                reject(err.message);
            }
            resolve(str);
        });
    });
};
const generateService = async (originalOpenApi, options) => {
    const { template = 'umi-request', importText = '', outputDir, typescript = false } = options;
    if (!outputDir) {
        throw new Error('please input outputDir!');
    }
    const templates = ['umi-request', 'axios'];
    if (!templates.includes(template)) {
        throw new Error(`oops, there is no template of ${template} so far, you can open an issue at https://github.com/huajiayi/openapi-tool/issues.`);
    }
    let openapi = JSON.parse(JSON.stringify(originalOpenApi));
    const { format } = options;
    if (format) {
        openapi = format(openapi);
    }
    const { types, apis } = openapi;
    if (typescript) {
        const filePath = resolve(__dirname, '../', 'src', 'template', 'type.ejs');
        const service = await renderFile(filePath, { types });
        const output = resolve(outputDir, 'typings.ts');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }
        fs.writeFileSync(output, service);
        report(output, service);
    }
    const tagMap = new Map();
    apis.forEach(api => {
        if (!tagMap.has(api.tag)) {
            tagMap.set(api.tag, []);
        }
        tagMap.get(api.tag)?.push(api);
    });
    tagMap.forEach(async (apis, tag) => {
        const filePath = resolve(__dirname, '../', 'src', 'template', `${template}.ejs`);
        const deps = new Set();
        apis.forEach((api) => {
            api.request.params.forEach((param) => {
                const dep = removeArraySign(param.type);
                if (types.some((type) => removeGenericsSign(type.name) === dep)) {
                    deps.add(dep);
                }
            });
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

const plugins = [];
class OpenApiTool {
    constructor(options) {
        const { data, url } = options;
        if (!data && !url) {
            throw new Error('please input either data or url!');
        }
        this.options = options;
        this.registerPlugins(plugins);
    }
    static use(plugin, options) {
        plugins.push({ plugin, options });
    }
    async getOpenApi() {
        const { data, url } = this.options;
        let jsonData = data;
        if (url) {
            jsonData = await request.get(url);
        }
        if (data && isString(data)) {
            jsonData = JSON.parse(data);
        }
        return getOpenApi(jsonData);
    }
    async generateService(options) {
        const openapi = await this.getOpenApi();
        await generateService(openapi, options);
    }
    registerPlugins(plugins) {
        plugins.forEach((pluginObj) => pluginObj.plugin(OpenApiTool, pluginObj.options));
    }
}

export default OpenApiTool;
