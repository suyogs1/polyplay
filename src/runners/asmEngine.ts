// Assembler V2 Engine - Full ISA with 8 registers, flags, memory, stack

export interface Flags {
  ZF: boolean; // Zero flag
  NF: boolean; // Negative flag
  CF: boolean; // Carry/borrow flag
  OF: boolean; // Overflow flag
}

export interface CPU {
  R: Int32Array; // R0-R7 general purpose registers
  SP: number;    // Stack pointer
  BP: number;    // Base pointer
  IP: number;    // Instruction pointer
  F: Flags;      // Flags register
  halted: boolean;
}

export interface Operand {
  type: 'reg' | 'imm' | 'mem' | 'label';
  value: number | string;
  offset?: number; // For [Rk+imm] addressing
}

export interface Instruction {
  op: string;
  operands: Operand[];
  line: number;
  source: string;
}

export interface Program {
  lines: string[];
  ast: Instruction[];
  labels: Record<string, number>;
  dataSection: Uint8Array;
  textStart: number;
}

export class AsmError extends Error {
  constructor(public line: number, message: string) {
    super(`Line ${line}: ${message}`);
    this.name = 'AsmError';
  }
}

const RAM_SIZE = 4096;

// Register name to index mapping
const REGISTERS: Record<string, number> = {
  'R0': 0, 'R1': 1, 'R2': 2, 'R3': 3,
  'R4': 4, 'R5': 5, 'R6': 6, 'R7': 7,
  'SP': -1, 'BP': -2
};

/**
 * Initialize CPU state
 */
export function reset(partial?: Partial<CPU>): CPU {
  return {
    R: new Int32Array(8),
    SP: RAM_SIZE - 4, // Stack grows downward
    BP: RAM_SIZE - 4,
    IP: 0,
    F: { ZF: false, NF: false, CF: false, OF: false },
    halted: false,
    ...partial
  };
}

/**
 * Parse operand string into structured operand
 */
function parseOperand(token: string, labels: Record<string, number>, lineNum: number): Operand {
  token = token.replace(/,$/, ''); // Remove trailing comma
  
  // Immediate value #42
  if (token.startsWith('#')) {
    const value = parseInt(token.slice(1), 10);
    if (isNaN(value)) throw new AsmError(lineNum, `Invalid immediate value: ${token}`);
    return { type: 'imm', value };
  }
  
  // Memory addressing [addr], [Rk], [Rk+imm]
  if (token.startsWith('[') && token.endsWith(']')) {
    const inner = token.slice(1, -1);
    
    // [Rk+imm] or [Rk-imm]
    const offsetMatch = inner.match(/^(R[0-7]|SP|BP)\s*([+-])\s*(\d+)$/i);
    if (offsetMatch) {
      const reg = offsetMatch[1].toUpperCase();
      const sign = offsetMatch[2];
      const offset = parseInt(offsetMatch[3], 10) * (sign === '+' ? 1 : -1);
      
      if (!(reg in REGISTERS)) throw new AsmError(lineNum, `Invalid register: ${reg}`);
      return { type: 'mem', value: REGISTERS[reg], offset };
    }
    
    // [Rk]
    if (inner.toUpperCase() in REGISTERS) {
      return { type: 'mem', value: REGISTERS[inner.toUpperCase()] };
    }
    
    // [addr] or [label]
    const addr = parseInt(inner, 10);
    if (!isNaN(addr)) {
      return { type: 'mem', value: addr };
    }
    
    // [label]
    return { type: 'mem', value: inner };
  }
  
  // Register
  if (token.toUpperCase() in REGISTERS) {
    return { type: 'reg', value: REGISTERS[token.toUpperCase()] };
  }
  
  // Numeric address or immediate (without #)
  const num = parseInt(token, 10);
  if (!isNaN(num)) {
    return { type: 'imm', value: num };
  }
  
  // Label
  return { type: 'label', value: token };
}

/**
 * Two-pass assembler
 */
export function assemble(source: string): Program {
  const lines = source.split('\n');
  const ast: Instruction[] = [];
  const labels: Record<string, number> = {};
  const dataSection = new Uint8Array(1024); // Simple data section
  
  let currentAddress = 0;
  let inDataSection = false;
  let dataPtr = 0;
  let textStart = 0;
  
  // Pass 1: Parse structure, collect labels
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('//')) {
      continue;
    }
    
    // Directives
    if (trimmed.startsWith('.')) {
      const directive = trimmed.split(/\s+/);
      const cmd = directive[0].toUpperCase();
      
      switch (cmd) {
        case '.DATA':
          inDataSection = true;
          continue;
        case '.TEXT':
          inDataSection = false;
          textStart = currentAddress;
          continue;
        case '.ORG':
          if (directive.length < 2) throw new AsmError(i + 1, '.ORG requires address');
          currentAddress = parseInt(directive[1], 10);
          if (isNaN(currentAddress)) throw new AsmError(i + 1, 'Invalid .ORG address');
          continue;
        case '.WORD':
          if (inDataSection) {
            const values = directive.slice(1).join(' ').split(',').map(v => parseInt(v.trim(), 10));
            for (const val of values) {
              if (isNaN(val)) throw new AsmError(i + 1, 'Invalid .WORD value');
              dataSection[dataPtr++] = val & 0xFF;
              dataSection[dataPtr++] = (val >> 8) & 0xFF;
              dataSection[dataPtr++] = (val >> 16) & 0xFF;
              dataSection[dataPtr++] = (val >> 24) & 0xFF;
            }
          }
          continue;
        case '.BYTE':
          if (inDataSection) {
            const values = directive.slice(1).join(' ').split(',').map(v => parseInt(v.trim(), 10));
            for (const val of values) {
              if (isNaN(val)) throw new AsmError(i + 1, 'Invalid .BYTE value');
              dataSection[dataPtr++] = val & 0xFF;
            }
          }
          continue;
      }
    }
    
    // Label definition
    if (trimmed.includes(':')) {
      const colonIndex = trimmed.indexOf(':');
      const labelName = trimmed.slice(0, colonIndex).trim();
      
      if (inDataSection) {
        labels[labelName] = dataPtr; // Data section labels get data pointer address
      } else {
        labels[labelName] = currentAddress; // Text section labels get instruction address
      }
      
      // Check if there's a directive after the label
      const afterColon = trimmed.slice(colonIndex + 1).trim();
      if (afterColon.startsWith('.')) {
        const directive = afterColon.split(/\s+/);
        const cmd = directive[0].toUpperCase();
        
        if (cmd === '.WORD') {
          const values = directive.slice(1).join(' ').split(',').map(v => parseInt(v.trim(), 10));
          for (const val of values) {
            if (isNaN(val)) throw new AsmError(i + 1, 'Invalid .WORD value');
            dataSection[dataPtr++] = val & 0xFF;
            dataSection[dataPtr++] = (val >> 8) & 0xFF;
            dataSection[dataPtr++] = (val >> 16) & 0xFF;
            dataSection[dataPtr++] = (val >> 24) & 0xFF;
          }
        }
      }
      continue;
    }
    
    // Instruction
    if (!inDataSection) {
      const tokens = trimmed.split(/\s+/);
      const op = tokens[0].toUpperCase();
      
      ast.push({
        op,
        operands: [],
        line: i + 1,
        source: trimmed
      });
      
      currentAddress++;
    }
  }
  
  // Pass 2: Parse operands and resolve addresses
  let astIndex = 0;
  currentAddress = textStart;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('//') || 
        trimmed.startsWith('.') || trimmed.endsWith(':')) {
      continue;
    }
    
    const tokens = trimmed.split(/\s+/);
    const op = tokens[0].toUpperCase();
    const operands: Operand[] = [];
    
    // Parse operands
    for (let j = 1; j < tokens.length; j++) {
      operands.push(parseOperand(tokens[j], labels, i + 1));
    }
    
    ast[astIndex].operands = operands;
    astIndex++;
    currentAddress++;
  }
  
  return {
    lines: source.split('\n'),
    ast,
    labels,
    dataSection,
    textStart
  };
}

/**
 * Resolve operand value
 */
function resolveOperand(operand: Operand, cpu: CPU, ram: DataView, labels: Record<string, number>): number {
  switch (operand.type) {
    case 'imm':
      return operand.value as number;
    
    case 'reg':
      const regIndex = operand.value as number;
      if (regIndex === -1) return cpu.SP;
      if (regIndex === -2) return cpu.BP;
      return cpu.R[regIndex];
    
    case 'mem':
      let addr: number;
      if (typeof operand.value === 'string') {
        // Label reference
        addr = labels[operand.value];
        if (addr === undefined) throw new Error(`Undefined label: ${operand.value}`);
      } else if (operand.value < 0) {
        // Register indirect
        const regIndex = operand.value;
        addr = (regIndex === -1 ? cpu.SP : regIndex === -2 ? cpu.BP : cpu.R[regIndex]);
        if (operand.offset) addr += operand.offset;
      } else {
        addr = operand.value;
      }
      
      if (addr < 0 || addr >= RAM_SIZE - 3) throw new Error(`Memory access out of bounds: ${addr}`);
      return ram.getInt32(addr, true); // Little endian
    
    case 'label':
      const labelAddr = labels[operand.value as string];
      if (labelAddr === undefined) throw new Error(`Undefined label: ${operand.value}`);
      return labelAddr;
    
    default:
      throw new Error(`Invalid operand type: ${operand.type}`);
  }
}

/**
 * Set flags based on result
 */
function setFlags(cpu: CPU, result: number, operation: 'add' | 'sub' | 'mul' | 'div' | 'cmp' | 'logic' = 'logic') {
  cpu.F.ZF = result === 0;
  cpu.F.NF = result < 0;
  
  // Carry and overflow flags depend on operation
  if (operation === 'add' || operation === 'sub') {
    // Simplified carry/overflow detection
    cpu.F.CF = Math.abs(result) > 0x7FFFFFFF;
    cpu.F.OF = result > 0x7FFFFFFF || result < -0x80000000;
  }
}

/**
 * Execute single instruction
 */
export function step(cpu: CPU, program: Program, ram: DataView): void {
  if (cpu.halted || cpu.IP >= program.ast.length) {
    cpu.halted = true;
    return;
  }
  
  const instruction = program.ast[cpu.IP];
  const { op, operands } = instruction;
  
  try {
    switch (op) {
      case 'NOP':
        break;
      
      case 'HALT':
        cpu.halted = true;
        return;
      
      case 'MOV': {
        if (operands.length !== 2) throw new Error('MOV requires 2 operands');
        let src: number;
        
        // Special handling for label addresses (like MOV R1, array)
        if (operands[1].type === 'label') {
          src = program.labels[operands[1].value as string];
          if (src === undefined) throw new Error(`Undefined label: ${operands[1].value}`);
        } else {
          src = resolveOperand(operands[1], cpu, ram, program.labels);
        }
        
        if (operands[0].type === 'reg') {
          const regIndex = operands[0].value as number;
          if (regIndex === -1) cpu.SP = src;
          else if (regIndex === -2) cpu.BP = src;
          else cpu.R[regIndex] = src;
        } else {
          throw new Error('MOV destination must be register');
        }
        break;
      }
      
      case 'LOAD': {
        if (operands.length !== 2) throw new Error('LOAD requires 2 operands');
        let value: number;
        
        // Handle [label] syntax for memory access
        if (operands[1].type === 'mem' && typeof operands[1].value === 'string') {
          const addr = program.labels[operands[1].value];
          if (addr === undefined) throw new Error(`Undefined label: ${operands[1].value}`);
          if (addr < 0 || addr >= RAM_SIZE - 3) throw new Error(`Memory access out of bounds: ${addr}`);
          value = ram.getInt32(addr, true);
        } else {
          value = resolveOperand(operands[1], cpu, ram, program.labels);
        }
        
        if (operands[0].type === 'reg') {
          const regIndex = operands[0].value as number;
          if (regIndex === -1) cpu.SP = value;
          else if (regIndex === -2) cpu.BP = value;
          else cpu.R[regIndex] = value;
        } else {
          throw new Error('LOAD destination must be register');
        }
        break;
      }
      
      case 'STORE': {
        if (operands.length !== 2) throw new Error('STORE requires 2 operands');
        const value = resolveOperand(operands[1], cpu, ram, program.labels);
        
        if (operands[0].type === 'mem') {
          let addr: number;
          if (typeof operands[0].value === 'string') {
            addr = program.labels[operands[0].value];
          } else if (operands[0].value < 0) {
            const regIndex = operands[0].value;
            addr = (regIndex === -1 ? cpu.SP : regIndex === -2 ? cpu.BP : cpu.R[regIndex]);
            if (operands[0].offset) addr += operands[0].offset;
          } else {
            addr = operands[0].value;
          }
          
          if (addr < 0 || addr >= RAM_SIZE - 3) throw new Error(`Memory store out of bounds: ${addr}`);
          ram.setInt32(addr, value, true);
        } else {
          throw new Error('STORE destination must be memory');
        }
        break;
      }
      
      case 'ADD': {
        if (operands.length !== 2) throw new Error('ADD requires 2 operands');
        const src = resolveOperand(operands[1], cpu, ram, program.labels);
        
        if (operands[0].type === 'reg') {
          const regIndex = operands[0].value as number;
          const current = regIndex === -1 ? cpu.SP : regIndex === -2 ? cpu.BP : cpu.R[regIndex];
          const result = current + src;
          
          if (regIndex === -1) cpu.SP = result;
          else if (regIndex === -2) cpu.BP = result;
          else cpu.R[regIndex] = result;
          
          setFlags(cpu, result, 'add');
        } else {
          throw new Error('ADD destination must be register');
        }
        break;
      }
      
      case 'SUB': {
        if (operands.length !== 2) throw new Error('SUB requires 2 operands');
        const src = resolveOperand(operands[1], cpu, ram, program.labels);
        
        if (operands[0].type === 'reg') {
          const regIndex = operands[0].value as number;
          const current = regIndex === -1 ? cpu.SP : regIndex === -2 ? cpu.BP : cpu.R[regIndex];
          const result = current - src;
          
          if (regIndex === -1) cpu.SP = result;
          else if (regIndex === -2) cpu.BP = result;
          else cpu.R[regIndex] = result;
          
          setFlags(cpu, result, 'sub');
        } else {
          throw new Error('SUB destination must be register');
        }
        break;
      }
      
      case 'MUL': {
        if (operands.length !== 2) throw new Error('MUL requires 2 operands');
        const src = resolveOperand(operands[1], cpu, ram, program.labels);
        
        if (operands[0].type === 'reg') {
          const regIndex = operands[0].value as number;
          const current = regIndex === -1 ? cpu.SP : regIndex === -2 ? cpu.BP : cpu.R[regIndex];
          const result = current * src;
          
          if (regIndex === -1) cpu.SP = result;
          else if (regIndex === -2) cpu.BP = result;
          else cpu.R[regIndex] = result;
          
          setFlags(cpu, result, 'mul');
        } else {
          throw new Error('MUL destination must be register');
        }
        break;
      }
      
      case 'DIV': {
        if (operands.length !== 2) throw new Error('DIV requires 2 operands');
        const src = resolveOperand(operands[1], cpu, ram, program.labels);
        
        if (src === 0) {
          cpu.F.CF = true;
          throw new Error('Division by zero');
        }
        
        if (operands[0].type === 'reg') {
          const regIndex = operands[0].value as number;
          const current = regIndex === -1 ? cpu.SP : regIndex === -2 ? cpu.BP : cpu.R[regIndex];
          const result = Math.floor(current / src);
          
          if (regIndex === -1) cpu.SP = result;
          else if (regIndex === -2) cpu.BP = result;
          else cpu.R[regIndex] = result;
          
          setFlags(cpu, result, 'div');
        } else {
          throw new Error('DIV destination must be register');
        }
        break;
      }
      
      case 'CMP': {
        if (operands.length !== 2) throw new Error('CMP requires 2 operands');
        const a = resolveOperand(operands[0], cpu, ram, program.labels);
        const b = resolveOperand(operands[1], cpu, ram, program.labels);
        const result = a - b;
        setFlags(cpu, result, 'cmp');
        break;
      }
      
      case 'JMP': {
        if (operands.length !== 1) throw new Error('JMP requires 1 operand');
        const target = resolveOperand(operands[0], cpu, ram, program.labels);
        cpu.IP = target;
        return; // Don't increment IP
      }
      
      case 'JZ':
        if (cpu.F.ZF) {
          const target = resolveOperand(operands[0], cpu, ram, program.labels);
          cpu.IP = target;
          return;
        }
        break;
      
      case 'JNZ':
        if (!cpu.F.ZF) {
          const target = resolveOperand(operands[0], cpu, ram, program.labels);
          cpu.IP = target;
          return;
        }
        break;
      
      case 'JC':
        if (cpu.F.CF) {
          const target = resolveOperand(operands[0], cpu, ram, program.labels);
          cpu.IP = target;
          return;
        }
        break;
      
      case 'JNC':
        if (!cpu.F.CF) {
          const target = resolveOperand(operands[0], cpu, ram, program.labels);
          cpu.IP = target;
          return;
        }
        break;
      
      case 'JG':
        if (!cpu.F.ZF && cpu.F.NF === cpu.F.OF) {
          const target = resolveOperand(operands[0], cpu, ram, program.labels);
          cpu.IP = target;
          return;
        }
        break;
      
      case 'JGE':
        if (cpu.F.NF === cpu.F.OF) {
          const target = resolveOperand(operands[0], cpu, ram, program.labels);
          cpu.IP = target;
          return;
        }
        break;
      
      case 'JL':
        if (cpu.F.NF !== cpu.F.OF) {
          const target = resolveOperand(operands[0], cpu, ram, program.labels);
          cpu.IP = target;
          return;
        }
        break;
      
      case 'JLE':
        if (cpu.F.ZF || cpu.F.NF !== cpu.F.OF) {
          const target = resolveOperand(operands[0], cpu, ram, program.labels);
          cpu.IP = target;
          return;
        }
        break;
      
      case 'INC': {
        if (operands.length !== 1) throw new Error('INC requires 1 operand');
        
        if (operands[0].type === 'reg') {
          const regIndex = operands[0].value as number;
          const current = regIndex === -1 ? cpu.SP : regIndex === -2 ? cpu.BP : cpu.R[regIndex];
          const result = current + 1;
          
          if (regIndex === -1) cpu.SP = result;
          else if (regIndex === -2) cpu.BP = result;
          else cpu.R[regIndex] = result;
          
          setFlags(cpu, result, 'add');
        } else {
          throw new Error('INC destination must be register');
        }
        break;
      }
      
      case 'DEC': {
        if (operands.length !== 1) throw new Error('DEC requires 1 operand');
        
        if (operands[0].type === 'reg') {
          const regIndex = operands[0].value as number;
          const current = regIndex === -1 ? cpu.SP : regIndex === -2 ? cpu.BP : cpu.R[regIndex];
          const result = current - 1;
          
          if (regIndex === -1) cpu.SP = result;
          else if (regIndex === -2) cpu.BP = result;
          else cpu.R[regIndex] = result;
          
          setFlags(cpu, result, 'sub');
        } else {
          throw new Error('DEC destination must be register');
        }
        break;
      }
      
      case 'LEA': {
        if (operands.length !== 2) throw new Error('LEA requires 2 operands');
        
        if (operands[0].type === 'reg') {
          const regIndex = operands[0].value as number;
          let addr: number;
          
          if (operands[1].type === 'label') {
            addr = program.labels[operands[1].value as string];
            if (addr === undefined) throw new Error(`Undefined label: ${operands[1].value}`);
          } else {
            addr = operands[1].value as number;
          }
          
          if (regIndex === -1) cpu.SP = addr;
          else if (regIndex === -2) cpu.BP = addr;
          else cpu.R[regIndex] = addr;
        } else {
          throw new Error('LEA destination must be register');
        }
        break;
      }
      
      case 'SYS': {
        if (operands.length !== 1) throw new Error('SYS requires 1 operand');
        const syscall = resolveOperand(operands[0], cpu, ram, program.labels);
        
        switch (syscall) {
          case 1: // PRINT_INT R0
            console.log(`SYS PRINT_INT: ${cpu.R[0]}`);
            break;
          case 2: // PRINT_STR [R1]
            const strAddr = cpu.R[1];
            let str = '';
            for (let i = 0; i < 256; i++) {
              const byte = ram.getUint8(strAddr + i);
              if (byte === 0) break;
              str += String.fromCharCode(byte);
            }
            console.log(`SYS PRINT_STR: ${str}`);
            break;
          case 3: // EXIT with code in R0
            console.log(`SYS EXIT: ${cpu.R[0]}`);
            cpu.halted = true;
            break;
          default:
            throw new Error(`Unknown syscall: ${syscall}`);
        }
        break;
      }
      
      case 'PUSH': {
        if (operands.length !== 1) throw new Error('PUSH requires 1 operand');
        const value = resolveOperand(operands[0], cpu, ram, program.labels);
        cpu.SP -= 4;
        if (cpu.SP < 0) throw new Error('Stack overflow');
        ram.setInt32(cpu.SP, value, true);
        break;
      }
      
      case 'POP': {
        if (operands.length !== 1) throw new Error('POP requires 1 operand');
        if (cpu.SP >= RAM_SIZE - 4) throw new Error('Stack underflow');
        const value = ram.getInt32(cpu.SP, true);
        cpu.SP += 4;
        
        if (operands[0].type === 'reg') {
          const regIndex = operands[0].value as number;
          if (regIndex === -1) cpu.SP = value;
          else if (regIndex === -2) cpu.BP = value;
          else cpu.R[regIndex] = value;
        } else {
          throw new Error('POP destination must be register');
        }
        break;
      }
      
      case 'CALL': {
        if (operands.length !== 1) throw new Error('CALL requires 1 operand');
        const target = resolveOperand(operands[0], cpu, ram, program.labels);
        
        // Push return address
        cpu.SP -= 4;
        if (cpu.SP < 0) throw new Error('Stack overflow');
        ram.setInt32(cpu.SP, cpu.IP + 1, true);
        
        cpu.IP = target;
        return; // Don't increment IP
      }
      
      case 'RET': {
        if (cpu.SP >= RAM_SIZE - 4) throw new Error('Stack underflow');
        cpu.IP = ram.getInt32(cpu.SP, true);
        cpu.SP += 4;
        return; // Don't increment IP
      }
      
      default:
        throw new Error(`Unknown instruction: ${op}`);
    }
    
    cpu.IP++;
    
  } catch (error) {
    throw new AsmError(instruction.line, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Run program with optional breakpoints and syscall handler
 */
export function run(
  cpu: CPU, 
  program: Program, 
  ram: DataView, 
  opts: {
    maxSteps?: number;
    breakpoints?: Set<number>;
    onSys?: (syscall: number, cpu: CPU, ram: DataView) => string;
  } = {}
): { steps: number } {
  const { maxSteps = 10000, breakpoints = new Set(), onSys } = opts;
  let steps = 0;
  
  while (!cpu.halted && steps < maxSteps) {
    // Check breakpoint
    if (breakpoints.has(cpu.IP)) {
      break;
    }
    
    step(cpu, program, ram);
    steps++;
  }
  
  return { steps };
}