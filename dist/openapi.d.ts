import { Spec2, Spec3 } from './swagger';
export declare enum Version {
    OAS2 = 0,
    OAS3 = 1
}
export interface Param {
    in?: string;
    name: string;
    type: string;
    description: string;
    required: boolean;
}
export interface Body {
    arrayType: string;
    params: Param[];
}
export interface API {
    tag: string;
    name: string;
    description: string;
    request: {
        url: string;
        urlText: string;
        method: string;
        params: Param[];
        filter: {
            path: Param[];
            query: Param[];
            body: Body;
            formdata: Param[];
        };
    };
    response: {
        type: string;
    };
}
export interface Type {
    isGenerics: boolean;
    name: string;
    description: string;
    params: Param[];
}
export interface OpenApi {
    types: Type[];
    apis: API[];
}
export declare const spec2ToOpenApi: (data: Spec2) => OpenApi;
export declare const spec3ToOpenApi: (data: Spec3) => OpenApi;
export declare const getOpenApi: (data: any) => OpenApi;
