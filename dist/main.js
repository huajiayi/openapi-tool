'use strict';

var request = require('umi-request');
var fs = require('fs');
var ejs = require('ejs');
var path = require('path');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var request__default = /*#__PURE__*/_interopDefaultLegacy(request);
var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);
var ejs__default = /*#__PURE__*/_interopDefaultLegacy(ejs);

const getAllDeps = (type) => {
    return type.split('<').map(t => t.replace(/>/g, '').replace(/\[\]/g, ''));
};
const toGenericsTypes = (types) => {
    return types.replace(/«/g, "<").replace(/»/g, ">");
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

const getType = (param, hasGenerics) => {
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
const getParams = (parameters, definitions) => {
    if (!parameters || parameters.length === 0) {
        return [];
    }
    if (parameters[0]?.in === "body") {
        const originalRef = parameters?.[0]?.schema.originalRef;
        const properties = definitions[originalRef]?.properties;
        return Object.keys(properties).map((name) => {
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
    return parameters.map((parameter) => {
        return {
            in: parameter.in,
            name: parameter.name,
            type: getType(parameter, false),
            description: parameter.description,
            required: parameter.required,
        };
    });
};
const getUrlText = (path) => {
    if (path.includes("{")) {
        return `\`${path.replace(/{/g, "${pathVars.")}\``;
    }
    return `\'${path}\'`;
};
const getApis = (data, types) => {
    const getResponseType = (responses, generics) => {
        const res = responses["200"];
        if (res.schema?.type) {
            return getType(res.schema);
        }
        if (res.schema?.originalRef) {
            const type = res.schema?.originalRef?.replace(/«/g, "<").replace(/»/g, ">");
            const deps = getAllDeps(type);
            if (deps.length === 1 && generics.includes(type)) {
                return type + "<any>";
            }
            const typesWithoutSign = types.map(type => removeGenericsSign(type.name));
            for (let i = 0; i < deps.length; i++) {
                if (!typesWithoutSign.includes(deps[i])) {
                    deps[i] = 'any';
                }
            }
            return toGenerics(deps);
        }
        return "any";
    };
    const apis = [];
    Object.keys(data.paths).forEach((path) => {
        const methods = data.paths[path];
        Object.keys(methods).forEach((method) => {
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
                    type: getResponseType(api.responses, types
                        .filter((type) => type.isGenerics)
                        .map((type) => removeGenericsSign(type.name))),
                },
            });
        });
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
            description: param.description,
            required: false,
        };
    });
};
const getTypes = (data) => {
    const definitions = data.definitions || {};
    const generics = new Set();
    Object.keys(definitions).forEach((definition) => {
        const genericArr = definition.split("«");
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
                description: def.description || '',
                params: getTypeParams(def.properties, isGenerics),
            });
        }
    });
    return types;
};
const renderFile = (file, data) => {
    return new Promise((resolve, reject) => {
        ejs__default['default'].renderFile(file, data, {}, (err, str) => {
            if (err) {
                reject(err.message);
            }
            resolve(str);
        });
    });
};
const generateService = async (data, outputDir) => {
    const types = getTypes(data);
    const filePath = path.resolve(__dirname, "../", "src", "template", "type.ejs");
    await renderFile(filePath, { types });
    path.resolve(outputDir, "typings.ts");
    const apis = getApis(data, types);
    const tagMap = new Map();
    data.tags?.forEach((tag) => {
        tagMap.set(tag.name, []);
    });
    apis.forEach((api) => tagMap.get(api.tag)?.push(api));
    tagMap.forEach(async (apis, tag) => {
        const filePath = path.resolve(__dirname, "../", "src", "template", "umi-request.ejs");
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
        const service = await renderFile(filePath, { deps, apis });
        const output = path.resolve(outputDir, `${tag}.ts`);
        fs__default['default'].writeFileSync(output, service);
    });
};

const generate = async (option) => {
    const { data, url, outputDir } = option;
    if (!data && !url) {
        throw new Error('please input either data or url!');
    }
    if (!outputDir) {
        throw new Error('please input outputDir!');
    }
    let jsonData = {};
    if (url) {
        jsonData = await request__default['default'].get(url);
    }
    if (data) {
        jsonData = JSON.parse(data);
    }
    generateService(jsonData, outputDir);
};

module.exports = generate;
