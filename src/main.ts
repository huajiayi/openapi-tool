import request from 'umi-request';
import { getOpenApi, OpenApi } from './openapi';
import generateService, { ServiceGeneratorOptions } from './serviceGenerator';
import { isString, replaceKeys, traverseAndReplace } from './utils';

export interface Options {
  data: string;
  url: string;
}

export type Plugin = (openApiTool: typeof OpenApiTool, options: any) => void;

type Plugins = {
  plugin: Plugin;
  options: any;
}[];

const plugins: Plugins = [];

export default class OpenApiTool {
  public static use(plugin: Plugin, options: any) {
    plugins.push({ plugin, options });
  }

  private options: Options;

  public constructor(options: Options) {
    const { data, url } = options;
    if (!data && !url) {
      throw new Error('please input either data or url!');
    }

    this.options = options;
    this.registerPlugins(plugins);
  }

  /** 获取OpenApi */
  public async getOpenApi(options?: ServiceGeneratorOptions): Promise<OpenApi> {
    const { data, url } = this.options;

    let jsonData: any = data;
    if (url) {
      jsonData = await request.get(url);
    }
    if (data && isString(data)) {
      jsonData = JSON.parse(data);
    }

    const genericFields = options?.genericFields;

    if (genericFields && genericFields.length > 0) {
      traverseAndReplace(jsonData, genericFields);
      if (jsonData.definitions) {
        jsonData.definitions = replaceKeys(jsonData.definitions, genericFields);
      }
      if (jsonData.components?.schemas) {
        jsonData.components.schemas = replaceKeys(jsonData.components.schemas, genericFields);
      }
    }

    return getOpenApi(jsonData);
  }

  /** 生成Service文件 */
  public async generateService(options: ServiceGeneratorOptions) {
    const openapi = await this.getOpenApi(options);
    await generateService(openapi, options);
  }

  /** 注册插件 */
  private registerPlugins(plugins: Plugins) {
    plugins.forEach((pluginObj) => pluginObj.plugin(OpenApiTool, pluginObj.options));
  }
}
// # sourceMappingURL=main.js.map
