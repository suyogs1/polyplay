# Polyglot Playground

A browser-only, single-page web application for teaching coding to both kids and professionals through interactive challenges.

## Features

- **Kids Mode**: Visual step-by-step learning with animations
- **Pro Mode**: Full Monaco editor with JavaScript and Python support
- **Assembler Mode**: Full-featured assembly language debugger with comprehensive ISA
- **Progress Tracking**: Streaks, badges, and gamification
- **AI Tutor**: Mock responses for error explanations and hints

## Quick Start

```bash
npm install
npm run dev
```

## Environment Variables

- `VITE_TUTOR_MODE`: "mock" (default) or "live" for real API calls
- `VITE_DISABLE_PY`: "1" to hide Python tab
- `VITE_DISABLE_ASM`: "1" to hide Assembler tab

## Architecture

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Code Execution**: Web Workers (JS) + Pyodide (Python) + Custom ASM interpreter
- **No Backend Required**: Everything runs in the browser
- **Lazy Loading**: Monaco Editor and Pyodide loaded on demand

## Supported Languages

- **JavaScript**: Sandboxed execution in Web Workers (1s timeout)
- **Python**: Pyodide with stdlib imports only (2s timeout)
- **Assembly**: Full ISA with 40+ instructions, 8 registers, flags, memory, stack, and debugging

## Challenge Format

Challenges are loaded from `/public/challenges.json` with the following structure:

```json
{
  "id": "sum-array",
  "title": "Sum the Numbers",
  "prompt": "Return the sum of all numbers in the array.",
  "tests": [{"input": [[1,2,3]], "output": 6}],
  "kids_pseudocode": ["Start with total = 0", "..."],
  "visual": {"type": "array", "initial": [1,2,3]}
}
```

## Performance

- Code splitting by tab
- Monaco Editor lazy-loaded
- Pyodide lazy-loaded on first Python execution
- Web Workers prevent UI blocking
- Responsive design for mobile

## Assembly Language Debugger

The assembler provides a complete learning environment for low-level programming:

### CPU Architecture
- **8 General-Purpose Registers**: R0-R7 (32-bit signed integers)
- **Special Registers**: Stack Pointer (SP), Base Pointer (BP), Instruction Pointer (IP)
- **Flags Register**: Zero (ZF), Negative (NF), Carry (CF), Overflow (OF)
- **Memory**: 4KB RAM with data section support

### Instruction Set
- **Data Movement**: MOV, LOAD, STORE, LEA
- **Arithmetic**: ADD, SUB, MUL, DIV, INC, DEC
- **Logic**: AND, OR, XOR, NOT, SHL, SHR
- **Comparison & Branching**: CMP, JMP, JZ, JNZ, JC, JNC, JN, JNN, JG, JGE, JL, JLE
- **Stack Operations**: PUSH, POP, CALL, RET
- **System**: NOP, HALT, SYS (syscalls for I/O)

### Debugging Features
- **Step-by-step execution** with visual current line highlighting
- **Breakpoints** - click in gutter to toggle
- **Register viewer** with real-time updates
- **Memory inspector** with hex dump and configurable range
- **Stack viewer** showing stack contents
- **Output console** for system call results
- **Variable execution speed** control

### Sample Programs
- **Sum Array**: Demonstrate array iteration and accumulation
- **Find Maximum**: Array traversal with conditional logic
- **Reverse String**: String manipulation and pointer arithmetic
- **Factorial**: Recursive function calls using stack
- **Fibonacci**: Iterative algorithm with loop control

### Assembly Syntax
```assembly
.DATA
numbers: .WORD 1, 2, 3, 4, 5
count: .WORD 5

.TEXT
start:
    LEA R0, numbers    ; Load effective address
    LOAD R1, [count]   ; Load from memory
    MOV R2, #0         ; Move immediate value
    ; ... program logic
    SYS #1             ; System call to print R0
    HALT               ; Stop execution
```

## Security

- JavaScript execution sandboxed in Web Workers
- Python imports restricted to stdlib only
- Assembly execution isolated with memory bounds checking
- No DOM/network access in execution contexts
- All code runs client-side only