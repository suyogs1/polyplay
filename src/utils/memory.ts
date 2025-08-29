// Memory utilities for assembler

export const RAM_SIZE = 4096;

/**
 * Create RAM with DataView for efficient access
 */
export function createRAM(size: number = RAM_SIZE): DataView {
  const buffer = new ArrayBuffer(size);
  return new DataView(buffer);
}

/**
 * Format number as hex with padding
 */
export function toHex(value: number, padding: number = 8): string {
  return '0x' + value.toString(16).toUpperCase().padStart(padding, '0');
}

/**
 * Format byte as 2-digit hex
 */
export function toHex8(value: number): string {
  return value.toString(16).toUpperCase().padStart(2, '0');
}

/**
 * Check if address is within bounds
 */
export function checkBounds(addr: number, size: number = 4, ramSize: number = RAM_SIZE): void {
  if (addr < 0 || addr + size > ramSize) {
    throw new Error(`Memory access out of bounds: ${toHex(addr)} (size ${size})`);
  }
}

/**
 * Get memory dump as hex strings
 */
export function getMemoryDump(ram: DataView, start: number = 0, length: number = 256): string[] {
  const lines: string[] = [];
  const bytesPerLine = 16;
  
  for (let i = 0; i < length; i += bytesPerLine) {
    const addr = start + i;
    if (addr >= ram.byteLength) break;
    
    let line = toHex(addr, 4) + ': ';
    let ascii = '';
    
    for (let j = 0; j < bytesPerLine && addr + j < ram.byteLength; j++) {
      const byte = ram.getUint8(addr + j);
      line += toHex8(byte) + ' ';
      ascii += (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
    }
    
    // Pad hex section
    while (line.length < 7 + bytesPerLine * 3) {
      line += ' ';
    }
    
    line += ' |' + ascii + '|';
    lines.push(line);
  }
  
  return lines;
}

/**
 * Get stack view (top N words)
 */
export function getStackView(ram: DataView, sp: number, count: number = 16): Array<{addr: number, value: number}> {
  const stack: Array<{addr: number, value: number}> = [];
  
  for (let i = 0; i < count; i++) {
    const addr = sp + (i * 4);
    if (addr >= ram.byteLength) break;
    
    try {
      const value = ram.getInt32(addr, true);
      stack.push({ addr, value });
    } catch {
      break;
    }
  }
  
  return stack;
}

/**
 * Write string to memory (null-terminated)
 */
export function writeString(ram: DataView, addr: number, str: string): void {
  checkBounds(addr, str.length + 1);
  
  for (let i = 0; i < str.length; i++) {
    ram.setUint8(addr + i, str.charCodeAt(i));
  }
  ram.setUint8(addr + str.length, 0); // Null terminator
}

/**
 * Read null-terminated string from memory
 */
export function readString(ram: DataView, addr: number, maxLength: number = 256): string {
  let str = '';
  
  for (let i = 0; i < maxLength && addr + i < ram.byteLength; i++) {
    const byte = ram.getUint8(addr + i);
    if (byte === 0) break;
    str += String.fromCharCode(byte);
  }
  
  return str;
}