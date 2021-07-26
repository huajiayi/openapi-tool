interface Option {
    data: string;
    url: string;
    outputDir: string;
}
declare const generate: (option: Partial<Option>) => Promise<void>;
export default generate;
