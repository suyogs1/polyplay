// Web Worker for sandboxed JavaScript execution
interface WorkerMessage {
  code: string;
  tests: { input: any[]; output: any }[];
  timeoutMs?: number;
}

interface TestResult {
  ok: boolean;
  expected: any;
  got: any;
  error?: string;
}

interface WorkerResponse {
  results: TestResult[];
  timeout?: boolean;
}

// Deep equality comparison
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  
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

// Shadow dangerous globals
const shadowedGlobals = {
  window: undefined,
  document: undefined,
  fetch: undefined,
  XMLHttpRequest: undefined,
  WebSocket: undefined,
  localStorage: undefined,
  sessionStorage: undefined,
  indexedDB: undefined,
  navigator: undefined,
  location: undefined,
  history: undefined,
  alert: undefined,
  confirm: undefined,
  prompt: undefined,
  open: undefined,
  close: undefined,
  eval: undefined,
  Function: undefined,
  setTimeout: undefined,
  setInterval: undefined,
  clearTimeout: undefined,
  clearInterval: undefined,
  importScripts: undefined,
  postMessage: undefined
};

self.onmessage = function(event: MessageEvent<WorkerMessage>) {
  const { code, tests, timeoutMs = 1000 } = event.data;
  
  let timeoutId: number;
  let hasTimedOut = false;
  
  // Set up timeout
  timeoutId = setTimeout(() => {
    hasTimedOut = true;
    self.postMessage({ 
      results: [], 
      timeout: true 
    } as WorkerResponse);
  }, timeoutMs);
  
  try {
    // Create isolated execution context
    const executeCode = new Function('shadowedGlobals', `
      // Shadow all dangerous globals
      ${Object.keys(shadowedGlobals).map(key => `var ${key} = shadowedGlobals.${key};`).join('\n')}
      
      // Execute user code
      ${code}
      
      // Return the solve function
      return typeof solve !== 'undefined' ? solve : null;
    `);
    
    const solve = executeCode(shadowedGlobals);
    
    if (typeof solve !== 'function') {
      clearTimeout(timeoutId);
      self.postMessage({
        results: [{
          ok: false,
          expected: 'function',
          got: typeof solve,
          error: 'Code must define a function named "solve"'
        }],
        timeout: false
      } as WorkerResponse);
      return;
    }
    
    const results: TestResult[] = [];
    
    // Execute each test case
    for (const test of tests) {
      if (hasTimedOut) break;
      
      try {
        const result = solve(...test.input);
        const passed = deepEqual(result, test.output);
        
        results.push({
          ok: passed,
          expected: test.output,
          got: result
        });
      } catch (error) {
        results.push({
          ok: false,
          expected: test.output,
          got: undefined,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    if (!hasTimedOut) {
      clearTimeout(timeoutId);
      self.postMessage({
        results,
        timeout: false
      } as WorkerResponse);
    }
    
  } catch (error) {
    if (!hasTimedOut) {
      clearTimeout(timeoutId);
      self.postMessage({
        results: [{
          ok: false,
          expected: 'valid code',
          got: 'syntax error',
          error: error instanceof Error ? error.message : String(error)
        }],
        timeout: false
      } as WorkerResponse);
    }
  }
};