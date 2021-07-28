interface Option {
    data: string;
    url: string;
    outputDir: string;
}
export declare const generateService: (option: Partial<Option>) => Promise<void>;
export {};
