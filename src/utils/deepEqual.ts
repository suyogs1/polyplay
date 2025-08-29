/**
 * Deep equality comparison for test results
 * Handles arrays, objects, primitives, and NaN
 */
export function deepEqual(a: any, b: any): boolean {
  // Handle NaN
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  
  // Strict equality check
  if (a === b) return true;
  
  // Null/undefined check
  if (a == null || b == null) return a === b;
  
  // Type check
  if (typeof a !== typeof b) return false;
  
  // Array comparison
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  
  // Object comparison
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  
  return false;
}