import { OpenApi } from './openapi';
export declare type Template = 'umi-request' | 'axios';
export interface ServiceGeneratorOptions {
    template: Template;
    importText: string;
    outputDir: string;
    typescript: boolean;
}
declare const generateService: (openapi: OpenApi, options: ServiceGeneratorOptions) => Promise<void>;
export default generateService;
