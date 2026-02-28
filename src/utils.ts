import path from 'path';

/**
 * /#/.../A -> A
 */
export const getOriginalRef = (ref?: string): string => {
  if (!ref) {
    return '';
  }

  const strs = ref.split('/');
  return strs[strs.length - 1];
}

/**
 * A<B<C>> -> [A, B, C]
 */
export const getAllDeps = (type?: string): string[] => {
  if (!type) {
    return [];
  }

  return type.split('<').map(t => t.replace(/>/g, '').replace(/\[\]/g, ''));
}

/**
 * A«B«C»» -> A<B<C>>
 */
export const toGenericsTypes = (types: string): string => {
  return types.replace(/«/g, '<').replace(/»/g, '>');
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
  console.log(blue(path.relative(process.cwd(), dist)) + ' ' + getSize(code));
}

export const getSize = (code: string) => {
  return (code.length / 1024).toFixed(2) + 'kb';
}

export const logError = (e: any) => {
  console.log(e);
}

export const blue = (str: string) => {
  return '\x1b[1m\x1b[34m' + str + '\x1b[39m\x1b[22m';
}

/**
 * 判断对象是否是字符串
 */
export const isString = (obj: any) => {
  return Object.prototype.toString.call(obj) === '[object String]';
}

/**
 * 格式化泛型名称
 * ResponseListUser -> Response«List«User»»
 */
export const normalizeGenerics = (name: string, genericFields?: string[]): string => {
  if (!genericFields || genericFields.length === 0) {
    return name;
  }

  let currentName = name;

  for (const wrapper of genericFields) {
    if (currentName.startsWith(wrapper) && currentName !== wrapper) {
      currentName = currentName.substring(wrapper.length);
      return `${wrapper}«${normalizeGenerics(currentName, genericFields)}»`;
    }
  }

  return name;
}

export const traverseAndReplace = (obj: any, genericFields: string[]) => {
  if (!obj || typeof obj !== 'object') {
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach(item => traverseAndReplace(item, genericFields));
    return;
  }
  for (const key of Object.keys(obj)) {
    if (key === '$ref' && typeof obj[key] === 'string') {
      const parts = obj[key].split('/');
      const name = parts.pop();
      if (name) {
        parts.push(normalizeGenerics(name, genericFields));
        obj[key] = parts.join('/');
      }
    } else {
      traverseAndReplace(obj[key], genericFields);
    }
  }
};

export const replaceKeys = (obj: any, genericFields: string[]) => {
  if (!obj || typeof obj !== 'object') return obj;
  const newObj: any = {};
  for (const key of Object.keys(obj)) {
    newObj[normalizeGenerics(key, genericFields)] = obj[key];
  }
  return newObj;
};