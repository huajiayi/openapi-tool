/**
 * A<B<C>> -> [A, B, C]
 */
export const getAllDeps = (type: string): string[] => {
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
