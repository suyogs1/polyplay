import React from 'react';
import { safeStringify } from '../utils/safeString';

interface TestCase {
  input: any[];
  output: any;
}

interface TestResult {
  ok: boolean;
  expected: any;
  got: any;
  error?: string;
}

interface TestPanelProps {
  tests: TestCase[];
  results?: TestResult[];
  logs?: string[];
}

const TestPanel: React.FC<TestPanelProps> = ({ tests, results, logs }) => {
  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return safeStringify(value);
  };

  const renderDiff = (expected: any, got: any) => {
    const expectedStr = formatValue(expected);
    const gotStr = formatValue(got);
    
    if (expectedStr === gotStr) return null;
    
    return (
      <div className="mt-2 text-xs">
        <div className="flex">
          <div className="w-16 text-gray-500 font-mono">Expected:</div>
          <div className="font-mono text-green-700 bg-green-50 px-1 rounded">{expectedStr}</div>
        </div>
        <div className="flex mt-1">
          <div className="w-16 text-gray-500 font-mono">Got:</div>
          <div className="font-mono text-red-700 bg-red-50 px-1 rounded">{gotStr}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 bg-gray-100 border-b border-gray-300">
        <h3 className="font-semibold text-gray-700">Test Results</h3>
        {results && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {results.filter(r => r.ok).length} / {results.length} passed
            </span>
            <div className={`w-3 h-3 rounded-full ${
              results.every(r => r.ok) ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {tests.map((test, index) => {
          const result = results?.[index];
          const hasResult = result !== undefined;
          const passed = result?.ok ?? false;

          return (
            <div
              key={index}
              className={`border rounded-lg p-3 ${
                !hasResult
                  ? 'border-gray-200 bg-gray-50'
                  : passed
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm text-gray-700">
                  Test {index + 1}
                </span>
                {hasResult && (
                  <div className={`flex items-center space-x-1 text-sm font-medium ${
                    passed ? 'text-green-700' : 'text-red-700'
                  }`}>
                    <span>{passed ? '✓' : '✗'}</span>
                    <span>{passed ? 'PASS' : 'FAIL'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div>
                  <div className="text-xs text-gray-500 font-medium mb-1">Input:</div>
                  <div className="font-mono text-sm bg-white p-2 rounded border">
                    {test.input.map(formatValue).join(', ')}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 font-medium mb-1">Expected Output:</div>
                  <div className="font-mono text-sm bg-white p-2 rounded border">
                    {formatValue(test.output)}
                  </div>
                </div>

                {hasResult && (
                  <>
                    {result.error ? (
                      <div>
                        <div className="text-xs text-red-600 font-medium mb-1">Error:</div>
                        <div className="font-mono text-sm bg-red-100 text-red-800 p-2 rounded border border-red-200">
                          {result.error}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs text-gray-500 font-medium mb-1">Actual Output:</div>
                        <div className={`font-mono text-sm p-2 rounded border ${
                          passed ? 'bg-green-100 text-green-800 border-green-200' : 'bg-white'
                        }`}>
                          {formatValue(result.got)}
                        </div>
                        {!passed && renderDiff(result.expected, result.got)}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {tests.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📝</div>
            <div>No test cases available</div>
          </div>
        )}

        {logs && logs.length > 0 && (
          <div className="border-t pt-3 mt-3">
            <h4 className="font-medium text-gray-700 mb-2">Console Output</h4>
            <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm max-h-32 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestPanel;