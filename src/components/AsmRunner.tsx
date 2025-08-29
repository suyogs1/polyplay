import React, { useState, useCallback, useEffect, useRef } from 'react';
import { assemble, reset, step, run, CPU, Program, AsmError } from '../runners/asmEngine';
import { createRAM, toHex, getMemoryDump, getStackView } from '../utils/memory';

interface SampleProgram {
  name: string;
  filename: string;
  description: string;
}

const SAMPLE_PROGRAMS: SampleProgram[] = [
  { name: 'Sum Array', filename: 'sum_array.asm', description: 'Sum N numbers in an array' },
  { name: 'Find Maximum', filename: 'max_value.asm', description: 'Find maximum value in array' },
  { name: 'Reverse String', filename: 'reverse_string.asm', description: 'Reverse a null-terminated string' },
  { name: 'Factorial', filename: 'factorial.asm', description: 'Calculate factorial using stack' },
  { name: 'Fibonacci', filename: 'fibonacci.asm', description: 'Calculate Nth Fibonacci number iteratively' }
];

const AsmRunner: React.FC = () => {
  const [code, setCode] = useState(`; Simple test program
.TEXT
    MOV R0, #10        ; Load 10 into R0
    MOV R1, #5         ; Load 5 into R1
    ADD R0, R1         ; R0 = R0 + R1 (should be 15)
    HALT               ; Stop execution`);

  const [cpu, setCpu] = useState<CPU>(() => reset());
  const [program, setProgram] = useState<Program | null>(null);
  const [ram, setRam] = useState(() => createRAM());
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string>('');
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
  const [output, setOutput] = useState<string[]>([]);
  const [memoryView, setMemoryView] = useState({ start: 0, length: 256 });
  const [runSpeed, setRunSpeed] = useState(100); // ms between steps
  const runIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Load sample program
  const loadSample = useCallback(async (filename: string) => {
    try {
      const response = await fetch(`/asm/${filename}`);
      if (response.ok) {
        const content = await response.text();
        setCode(content);
      } else {
        console.warn(`Could not load sample: ${filename}`);
      }
    } catch (err) {
      console.warn(`Error loading sample: ${filename}`, err);
    }
  }, []);

  // Assemble code
  const handleAssemble = useCallback(() => {
    try {
      const newProgram = assemble(code);
      setProgram(newProgram);
      setError('');

      // Initialize RAM with data section
      const newRam = createRAM();
      // Copy data section to RAM starting at address 0
      for (let i = 0; i < newProgram.dataSection.length; i++) {
        newRam.setUint8(i, newProgram.dataSection[i]);
      }
      setRam(newRam);
      return newProgram;
    } catch (err) {
      if (err instanceof AsmError) {
        setError(err.message);
        highlightErrorLine(err.line);
      } else {
        setError(`Assembly error: ${err instanceof Error ? err.message : String(err)}`);
      }
      return null;
    }
  }, [code]);

  // Highlight error line in editor
  const highlightErrorLine = useCallback((lineNum: number) => {
    if (editorRef.current) {
      const lines = code.split('\n');
      let charPos = 0;
      for (let i = 0; i < lineNum - 1 && i < lines.length; i++) {
        charPos += lines[i].length + 1; // +1 for newline
      }
      editorRef.current.focus();
      editorRef.current.setSelectionRange(charPos, charPos + (lines[lineNum - 1]?.length || 0));
    }
  }, [code]);

  // Execute single step
  const handleStep = useCallback(() => {
    if (!program) {
      const newProgram = handleAssemble();
      if (!newProgram) return;
      setProgram(newProgram);
    }

    try {
      const newCpu = { ...cpu };
      step(newCpu, program, ram);
      setCpu(newCpu);
      setError('');
    } catch (err) {
      if (err instanceof AsmError) {
        setError(err.message);
        highlightErrorLine(err.line);
      } else {
        setError(`Runtime error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }, [cpu, program, ram, handleAssemble, highlightErrorLine]);

  // Step over (skip into calls)
  const handleStepOver = useCallback(() => {
    if (!program) return;

    const currentInstruction = program.ast[cpu.IP];
    if (currentInstruction?.op === 'CALL') {
      // Set temporary breakpoint at next instruction
      const tempBreakpoint = cpu.IP + 1;
      const newBreakpoints = new Set(breakpoints);
      newBreakpoints.add(tempBreakpoint);

      try {
        const newCpu = { ...cpu };
        run(newCpu, program, ram, {
          breakpoints: newBreakpoints,
          maxSteps: 10000,
          onSys: handleSyscall
        });
        setCpu(newCpu);

        // Remove temporary breakpoint
        newBreakpoints.delete(tempBreakpoint);
        setBreakpoints(newBreakpoints);
      } catch (err) {
        setError(`Runtime error: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      handleStep();
    }
  }, [cpu, program, ram, breakpoints, handleStep]);

  // Run program
  const handleRun = useCallback(() => {
    if (!program) {
      const newProgram = handleAssemble();
      if (!newProgram) return;
      setProgram(newProgram);
    }

    setIsRunning(true);

    const runStep = () => {
      if (cpu.halted || breakpoints.has(cpu.IP)) {
        setIsRunning(false);
        if (runIntervalRef.current) {
          clearInterval(runIntervalRef.current);
          runIntervalRef.current = null;
        }
        return;
      }

      try {
        const newCpu = { ...cpu };
        step(newCpu, program, ram);
        setCpu(newCpu);
        setError('');
      } catch (err) {
        setIsRunning(false);
        if (runIntervalRef.current) {
          clearInterval(runIntervalRef.current);
          runIntervalRef.current = null;
        }
        setError(`Runtime error: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    runIntervalRef.current = setInterval(runStep, runSpeed);
  }, [cpu, program, ram, breakpoints, runSpeed]);

  // Continue execution
  const handleContinue = useCallback(() => {
    if (!program) return;

    try {
      const newCpu = { ...cpu };
      run(newCpu, program, ram, {
        breakpoints,
        maxSteps: 10000,
        onSys: handleSyscall
      });
      setCpu(newCpu);
      setError('');
    } catch (err) {
      setError(`Runtime error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [cpu, program, ram, breakpoints]);

  // Reset CPU and memory
  const handleReset = useCallback(() => {
    setCpu(reset());
    setRam(createRAM());
    setProgram(null);
    setError('');
    setOutput([]);
    if (runIntervalRef.current) {
      clearInterval(runIntervalRef.current);
      runIntervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  // Handle syscalls
  const handleSyscall = useCallback((syscall: number, cpu: CPU, ram: DataView): string => {
    let result = '';
    switch (syscall) {
      case 1: // PRINT_INT R0
        result = `${cpu.R[0]}`;
        setOutput(prev => [...prev, result]);
        break;
      case 2: // PRINT_STR [R1]
        const strAddr = cpu.R[1];
        let str = '';
        for (let i = 0; i < 256; i++) {
          const byte = ram.getUint8(strAddr + i);
          if (byte === 0) break;
          str += String.fromCharCode(byte);
        }
        setOutput(prev => [...prev, str]);
        result = str;
        break;
      case 3: // EXIT
        result = `Exit code: ${cpu.R[0]}`;
        setOutput(prev => [...prev, result]);
        break;
    }
    return result;
  }, []);

  // Toggle breakpoint
  const toggleBreakpoint = useCallback((line: number) => {
    const newBreakpoints = new Set(breakpoints);
    if (newBreakpoints.has(line)) {
      newBreakpoints.delete(line);
    } else {
      newBreakpoints.add(line);
    }
    setBreakpoints(newBreakpoints);
  }, [breakpoints]);

  // Handle editor gutter click
  const handleGutterClick = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (!editorRef.current) return;

    const rect = editorRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const lineHeight = 20; // Approximate line height
    const lineNumber = Math.floor(y / lineHeight) + 1;

    // Only toggle if click is in the gutter area (first 40px)
    if (e.clientX - rect.left < 40) {
      toggleBreakpoint(lineNumber);
    }
  }, [toggleBreakpoint]);

  // Stop running on unmount
  useEffect(() => {
    return () => {
      if (runIntervalRef.current) {
        clearInterval(runIntervalRef.current);
      }
    };
  }, []);

  const currentLine = program ? cpu.IP : -1;
  const memoryDump = getMemoryDump(ram, memoryView.start, memoryView.length);
  const stackDump = getStackView(ram, cpu.SP);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-300 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Assembler Debugger</h2>

          {/* Sample Programs */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Sample:</label>
            <select
              onChange={(e) => e.target.value && loadSample(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
              value=""
            >
              <option value="">Load Sample...</option>
              {SAMPLE_PROGRAMS.map(prog => (
                <option key={prog.filename} value={prog.filename}>
                  {prog.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2 flex-wrap">
          <button
            onClick={handleAssemble}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Assemble
          </button>
          <button
            onClick={handleStep}
            disabled={isRunning}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Step
          </button>
          <button
            onClick={handleStepOver}
            disabled={isRunning}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            Step Over
          </button>
          <button
            onClick={isRunning ? () => {
              setIsRunning(false);
              if (runIntervalRef.current) {
                clearInterval(runIntervalRef.current);
                runIntervalRef.current = null;
              }
            } : handleRun}
            className={`px-4 py-2 text-white rounded transition-colors ${isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
              }`}
          >
            {isRunning ? 'Stop' : 'Run'}
          </button>
          <button
            onClick={handleContinue}
            disabled={isRunning}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            Continue
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Reset
          </button>

          {/* Speed Control */}
          <div className="flex items-center space-x-2 ml-4">
            <label className="text-sm font-medium text-gray-700">Speed:</label>
            <input
              type="range"
              min="10"
              max="1000"
              value={runSpeed}
              onChange={(e) => setRunSpeed(parseInt(e.target.value))}
              className="w-20"
            />
            <span className="text-sm text-gray-600">{runSpeed}ms</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Code Editor */}
        <div className="flex-1 flex flex-col border-r border-gray-300">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
            <h3 className="font-semibold text-gray-700">Assembly Code</h3>
          </div>
          <div className="flex-1 relative">
            <textarea
              ref={editorRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onClick={handleGutterClick}
              className="w-full h-full p-4 font-mono text-sm resize-none border-none outline-none"
              style={{ lineHeight: '20px' }}
              spellCheck={false}
            />

            {/* Breakpoint indicators */}
            <div className="absolute left-0 top-0 w-8 h-full pointer-events-none">
              {Array.from(breakpoints).map(line => (
                <div
                  key={line}
                  className="absolute w-2 h-2 bg-red-500 rounded-full"
                  style={{ top: `${(line - 1) * 20 + 6}px`, left: '4px' }}
                />
              ))}
            </div>

            {/* Current line indicator */}
            {currentLine >= 0 && (
              <div
                className="absolute left-0 w-full bg-yellow-200 opacity-50 pointer-events-none"
                style={{ top: `${currentLine * 20}px`, height: '20px' }}
              />
            )}
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-red-100 border-t border-red-300 p-3">
              <div className="text-red-700 font-mono text-sm">{error}</div>
            </div>
          )}
        </div>

        {/* Debug Panels */}
        <div className="w-96 flex flex-col bg-white">
          {/* Registers */}
          <div className="border-b border-gray-300">
            <div className="bg-gray-100 px-4 py-2">
              <h3 className="font-semibold text-gray-700">Registers</h3>
            </div>
            <div className="p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4">
                {cpu.R.map((value, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="font-mono font-semibold text-blue-600">R{index}:</span>
                    <span className="font-mono">{toHex(value)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-mono font-semibold text-purple-600">SP:</span>
                  <span className="font-mono">{toHex(cpu.SP)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono font-semibold text-purple-600">BP:</span>
                  <span className="font-mono">{toHex(cpu.BP)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono font-semibold text-orange-600">IP:</span>
                  <span className="font-mono">{cpu.IP}</span>
                </div>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="text-sm text-gray-600">Flags:</div>
                <div className="flex space-x-4 text-sm">
                  <span className={cpu.F.ZF ? 'text-green-600' : 'text-gray-400'}>ZF</span>
                  <span className={cpu.F.NF ? 'text-green-600' : 'text-gray-400'}>NF</span>
                  <span className={cpu.F.CF ? 'text-green-600' : 'text-gray-400'}>CF</span>
                  <span className={cpu.F.OF ? 'text-green-600' : 'text-gray-400'}>OF</span>
                </div>
              </div>
            </div>
          </div>

          {/* Memory View */}
          <div className="border-b border-gray-300 flex-1">
            <div className="bg-gray-100 px-4 py-2 flex items-center justify-between">
              <h3 className="font-semibold text-gray-700">Memory</h3>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={memoryView.start}
                  onChange={(e) => setMemoryView(prev => ({ ...prev, start: parseInt(e.target.value) || 0 }))}
                  className="w-16 px-2 py-1 text-xs border rounded"
                  placeholder="Start"
                />
                <span className="text-xs">-</span>
                <input
                  type="number"
                  value={memoryView.length}
                  onChange={(e) => setMemoryView(prev => ({ ...prev, length: parseInt(e.target.value) || 256 }))}
                  className="w-16 px-2 py-1 text-xs border rounded"
                  placeholder="Length"
                />
              </div>
            </div>
            <div className="p-2 overflow-y-auto max-h-48">
              <pre className="text-xs font-mono">
                {memoryDump.join('\n')}
              </pre>
            </div>
          </div>

          {/* Stack View */}
          <div className="border-b border-gray-300">
            <div className="bg-gray-100 px-4 py-2">
              <h3 className="font-semibold text-gray-700">Stack</h3>
            </div>
            <div className="p-4 space-y-1">
              {stackDump.map((entry, index) => (
                <div key={index} className="flex justify-between text-sm font-mono">
                  <span className="text-gray-600">{toHex(entry.addr, 4)}:</span>
                  <span>{toHex(entry.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Output Console */}
          <div className="flex-1">
            <div className="bg-gray-100 px-4 py-2">
              <h3 className="font-semibold text-gray-700">Output</h3>
            </div>
            <div className="p-4 bg-gray-900 text-green-400 font-mono text-sm overflow-y-auto max-h-32">
              {output.map((line, index) => (
                <div key={index}>{line}</div>
              ))}
              {output.length === 0 && (
                <div className="text-gray-500">No output</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AsmRunner;