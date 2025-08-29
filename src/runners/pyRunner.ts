// Python runner using Pyodide for client-side Python execution

interface TestResult {
  ok: boolean;
  expected: any;
  got: any;
  error?: string;
}

interface RunPyResult {
  results: TestResult[];
  timeout: boolean;
  stderr?: string;
}

// Global Pyodide instance cache
let pyodideInstance: any = null;
let pyodideLoading: Promise<any> | null = null;

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

/**
 * Initialize Pyodide - loads from CDN on first call and caches it
 */
export async function initPy(): Promise<any> {
  if (pyodideInstance) {
    return pyodideInstance;
  }
  
  if (pyodideLoading) {
    return pyodideLoading;
  }
  
  pyodideLoading = (async () => {
    try {
      // Dynamically load Pyodide
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js';
      document.head.appendChild(script);
      
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });
      
      const pyodide = await (window as any).loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/",
      });
      
      // Set up restricted environment
      await pyodide.runPython(`
import sys
import builtins

# List of allowed stdlib modules
_allowed_modules = {
    'builtins', 'sys', 'math', 'random', 'json', 'itertools', 
    'functools', 'collections', 'heapq', 'bisect', 're', 
    'string', 'datetime', 'decimal', 'fractions', 'copy'
}

# Override __import__ to restrict imports
_original_import = builtins.__import__

def _restricted_import(name, globals=None, locals=None, fromlist=(), level=0):
    if name.split('.')[0] not in _allowed_modules:
        raise ImportError(f"Import of '{name}' is not allowed in this environment")
    return _original_import(name, globals, locals, fromlist, level)

builtins.__import__ = _restricted_import

# Block file operations
builtins.open = lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("File operations not allowed"))
      `);
      
      pyodideInstance = pyodide;
      return pyodide;
    } catch (error) {
      pyodideLoading = null;
      throw new Error(`Failed to load Pyodide: ${error}`);
    }
  })();
  
  return pyodideLoading;
}

/**
 * Run Python code with test cases
 */
export async function runPy(
  code: string, 
  tests: { input: any[]; output: any }[], 
  timeoutMs = 2000
): Promise<RunPyResult> {
  try {
    const pyodide = await initPy();
    
    // Check if code defines a solve function
    if (!code.includes('def solve(')) {
      return {
        results: [{
          ok: false,
          expected: 'function definition',
          got: 'no solve function',
          error: 'Code must define a function named "solve"'
        }],
        timeout: false
      };
    }
    
    const results: TestResult[] = [];
    let stderr = '';
    
    // Set up stderr capture
    await pyodide.runPython(`
import sys
from io import StringIO
_stderr_capture = StringIO()
sys.stderr = _stderr_capture
    `);
    
    // Execute the user code with timeout
    const executeWithTimeout = async (): Promise<void> => {
      // Execute user code
      await pyodide.runPythonAsync(code);
      
      // Run each test case
      for (const test of tests) {
        try {
          // Set up test input
          pyodide.globals.set('_test_input', test.input);
          
          const result = await pyodide.runPythonAsync(`
_result = solve(*_test_input)
_result
          `);
          
          // Convert Python result to JavaScript
          const jsResult = result?.toJs ? result.toJs({ deep: true }) : result;
          
          // Compare with expected output
          const passed = deepEqual(jsResult, test.output);
          
          results.push({
            ok: passed,
            expected: test.output,
            got: jsResult
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
    };
    
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('timeout'));
      }, timeoutMs);
    });
    
    // Race execution against timeout
    try {
      await Promise.race([executeWithTimeout(), timeoutPromise]);
      
      // Capture stderr
      const stderrOutput = await pyodide.runPython(`
_stderr_content = _stderr_capture.getvalue()
_stderr_capture.close()
sys.stderr = sys.__stderr__
_stderr_content
      `);
      
      if (stderrOutput) {
        stderr = stderrOutput;
      }
      
      return {
        results,
        timeout: false,
        stderr: stderr || undefined
      };
      
    } catch (error) {
      if (error instanceof Error && error.message === 'timeout') {
        return {
          results: [],
          timeout: true
        };
      }
      
      // Capture stderr even on error
      try {
        const stderrOutput = await pyodide.runPython(`
_stderr_content = _stderr_capture.getvalue()
_stderr_capture.close()
sys.stderr = sys.__stderr__
_stderr_content
        `);
        if (stderrOutput) {
          stderr = stderrOutput;
        }
      } catch {
        // Ignore stderr capture errors
      }
      
      return {
        results: [{
          ok: false,
          expected: 'valid code execution',
          got: 'error',
          error: error instanceof Error ? error.message : String(error)
        }],
        timeout: false,
        stderr: stderr || undefined
      };
    }
    
  } catch (error) {
    return {
      results: [],
      timeout: false,
      stderr: `Pyodide initialization failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Export types for use in other modules
export type { TestResult, RunPyResult };