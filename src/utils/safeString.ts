/**
 * Safely stringify objects, handling circular references
 */
export function safeStringify(obj: any, maxDepth = 10): string {
  const seen = new WeakSet();
  
  function replacer(key: string, value: any, depth = 0): any {
    if (depth > maxDepth) {
      return '[Max Depth Reached]';
    }
    
    if (value === null) return null;
    if (typeof value !== 'object') return value;
    
    if (seen.has(value)) {
      return '[Circular Reference]';
    }
    
    seen.add(value);
    
    if (Array.isArray(value)) {
      return value.map((item, index) => replacer(String(index), item, depth + 1));
    }
    
    const result: any = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = replacer(k, v, depth + 1);
    }
    return result;
  }
  
  try {
    return JSON.stringify(replacer('', obj), null, 2);
  } catch (error) {
    return `[Stringify Error: ${error instanceof Error ? error.message : String(error)}]`;
  }
}