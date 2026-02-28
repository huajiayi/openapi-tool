import { OpenApi } from './openapi';
import { ServiceGeneratorOptions } from './serviceGenerator';
export interface Options {
    data: string;
    url: string;
}
export declare type Plugin = (openApiTool: typeof OpenApiTool, options: any) => void;
export default class OpenApiTool {
    static use(plugin: Plugin, options: any): void;
    private options;
    constructor(options: Options);
    getOpenApi(options?: ServiceGeneratorOptions): Promise<OpenApi>;
    generateService(options: ServiceGeneratorOptions): Promise<void>;
    private registerPlugins;
}
