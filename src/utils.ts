import path from "path";

/**
 * /#/.../A -> A
 */
export const getOriginalRef = (ref?: string): string => {
  if(!ref) {
    return '';
  }

  const strs = ref.split('/');
  return strs[strs.length - 1];
}

/**
 * A<B<C>> -> [A, B, C]
 */
export const getAllDeps = (type?: string): string[] => {
  if(!type) {
    return [];
  }

  return type.split('<').map(t => t.replace(/>/g, '').replace(/\[\]/g, ''));
}

/**
 * A«B«C»» -> A<B<C>>
 */
export const toGenericsTypes = (types: string): string => {
  return types.replace(/«/g, "<").replace(/»/g, ">");
}

/**
 * [A, B, C] -> A<B<C>>, [A] -> A
 */
export const toGenerics = (types: string[]): string => {
  return types.length === 1 ? types[0] : `${types.join('<')}${types.slice(1).map(() => '>').join('')}`;
}

/**
 * A<T> -> A
 */
export const removeGenericsSign = (type: string): string => {
  return type.replace(/<T>/g, '')
}

/**
 * A[] -> A
 */
export const removeArraySign = (type: string): string => {
  return type.replace(/\[\]/g, '')
}

/**
 * A<T> -> true, A -> false
 */
export const isGenerics = (type: string): boolean => {
  return type.includes('<T>');
}

export const report = (dist: string, code: string) => {
  console.log(blue(path.relative(process.cwd(), dist)) + " " + getSize(code));
}

export const getSize = (code: string) => {
  return (code.length / 1024).toFixed(2) + "kb";
}

export const logError = (e: any) => {
  console.log(e);
}

export const blue = (str: string) => {
  return "\x1b[1m\x1b[34m" + str + "\x1b[39m\x1b[22m";
}
