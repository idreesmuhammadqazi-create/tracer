import { MemoryLocation, StackFrame, HeapAllocation, MemoryState } from '../types/lowlogic-types';

export class MemoryManager {
  private memory: Map<number, MemoryLocation> = new Map();
  private heapAllocations: Map<string, HeapAllocation> = new Map();
  private addressToAllocation: Map<number, string> = new Map();
  private callStack: StackFrame[] = [];
  private globalVariables: Record<string, MemoryLocation> = {};

  // Memory layout
  private stackBase = 0x7FFFFFF0000;
  private heapBase = 0x10000000;
  private staticBase = 0x60000000;

  // Current pointers
  private stackPointer = this.stackBase;
  private heapPointer = this.heapBase;
  private staticPointer = this.staticBase;

  // Memory tracking for visualization
  private memoryChanges: any[] = [];

  reset(): void {
    this.memory.clear();
    this.heapAllocations.clear();
    this.addressToAllocation.clear();
    this.callStack = [];
    this.globalVariables.clear();
    this.memoryChanges = [];
    this.stackPointer = this.stackBase;
    this.heapPointer = this.heapBase;
    this.staticPointer = this.staticBase;
  }

  allocateStack(size: number, typeName: string, name?: string): MemoryLocation {
    this.stackPointer -= size;
    const address = this.stackPointer;

    const value = this.getDefaultValue(typeName);
    const location: MemoryLocation = {
      address,
      size,
      value,
      type: typeName,
      region: 'stack',
      name,
      isPointer: typeName.includes('ptr'),
      pointerTarget: undefined
    };

    this.memory.set(address, location);

    // Add to current stack frame if exists
    if (this.callStack.length > 0) {
      this.callStack[this.callStack.length - 1].localVariables[name || `var_${address}`] = location;
    } else {
      // Global variable
      if (name) {
        this.globalVariables[name] = location;
      }
    }

    this.trackMemoryChange('allocate_stack', location);
    return location;
  }

  allocateHeap(size: number, typeName: string): HeapAllocation {
    const allocationId = `heap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const address = this.heapPointer;
    this.heapPointer += size;

    const allocation: HeapAllocation = {
      allocationId,
      address,
      size,
      data: new Array(size).fill(0),
      isFreed: false,
      refCount: 0
    };

    this.heapAllocations.set(allocationId, allocation);
    this.addressToAllocation.set(address, allocationId);

    this.trackMemoryChange('allocate_heap', {
      allocationId,
      address,
      size
    });

    return allocation;
  }

  freeHeap(allocationId: string): void {
    const allocation = this.heapAllocations.get(allocationId);
    if (allocation) {
      allocation.isFreed = true;

      // Clear any pointers to this allocation
      const address = allocation.address;
      this.memory.forEach((location, addr) => {
        if (location.pointerTarget === address) {
          location.pointerTarget = undefined;
          location.value = null;
        }
      });

      this.trackMemoryChange('free_heap', {
        allocationId
      });
    }
  }

  createPointer(targetAddress: number | undefined, pointerType: string, name?: string): MemoryLocation {
    const location = this.allocateStack(8, pointerType, name);
    location.isPointer = true;
    location.pointerTarget = targetAddress;
    location.value = targetAddress;

    if (targetAddress) {
      this.updatePointerRelationship(location.address, targetAddress);
    }

    this.trackMemoryChange('create_pointer', location);
    return location;
  }

  updatePointer(pointerAddr: number, newTarget: number | undefined): void {
    const location = this.memory.get(pointerAddr);
    if (location) {
      const oldTarget = location.pointerTarget;

      // Remove old relationship
      if (oldTarget) {
        this.removePointerRelationship(pointerAddr, oldTarget);
      }

      // Update pointer
      location.pointerTarget = newTarget;
      location.value = newTarget;

      // Add new relationship
      if (newTarget) {
        this.updatePointerRelationship(pointerAddr, newTarget);
      }

      this.trackMemoryChange('update_pointer', {
        pointerAddress: pointerAddr,
        oldTarget,
        newTarget
      });
    }
  }

  writeMemory(address: number, value: any, typeName: string): boolean {
    const location = this.memory.get(address);
    if (location) {
      const oldValue = location.value;
      location.value = value;

      this.trackMemoryChange('write_memory', {
        address,
        oldValue,
        newValue: value,
        type: typeName
      });

      return true;
    }
    return false;
  }

  readMemory(address: number): any {
    const location = this.memory.get(address);
    return location ? location.value : undefined;
  }

  getMemoryLocation(address: number): MemoryLocation | undefined {
    return this.memory.get(address);
  }

  pushStackFrame(functionName: string, returnAddress: number = 0): void {
    const frame: StackFrame = {
      functionName,
      returnAddress,
      basePointer: this.stackPointer,
      localVariables: {},
      parameters: {}
    };
    this.callStack.push(frame);

    this.trackMemoryChange('push_stack_frame', {
      functionName,
      returnAddress
    });
  }

  popStackFrame(): StackFrame | undefined {
    if (this.callStack.length === 0) return undefined;

    const frame = this.callStack.pop();
    if (frame) {
      this.stackPointer = frame.basePointer;
    }

    this.trackMemoryChange('pop_stack_frame', {
      functionName: frame.functionName
    });

    return frame;
  }

  getVariables(): Record<string, any> {
    const variables: Record<string, any> = {};

    // Global variables
    Object.entries(this.globalVariables).forEach(([name, location]) => {
      variables[name] = this.formatVariable(location);
    });

    // Current stack frame variables
    if (this.callStack.length > 0) {
      const frame = this.callStack[this.callStack.length - 1];
      Object.entries(frame.localVariables).forEach(([name, location]) => {
        variables[name] = this.formatVariable(location);
      });
      Object.entries(frame.parameters).forEach(([name, location]) => {
        variables[`param_${name}`] = this.formatVariable(location);
      });
    }

    return variables;
  }

  getCallStack(): StackFrame[] {
    return this.callStack.map(frame => ({
      ...frame,
      localVariables: Object.fromEntries(
        Object.entries(frame.localVariables).map(([name, loc]) => [name, this.formatVariable(loc)])
      ),
      parameters: Object.fromEntries(
        Object.entries(frame.parameters).map(([name, loc]) => [name, this.formatVariable(loc)])
      )
    }));
  }

  getHeapState(): HeapAllocation[] {
    return Array.from(this.heapAllocations.values()).filter(alloc => !alloc.isFreed);
  }

  getPointerGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    this.memory.forEach((location, address) => {
      if (location.isPointer && location.pointerTarget) {
        const sourceHex = this.addressToHex(address);
        const targetHex = this.addressToHex(location.pointerTarget);
        if (!graph[sourceHex]) {
          graph[sourceHex] = [];
        }
        graph[sourceHex].push(targetHex);
      }
    });
    return graph;
  }

  getState(): MemoryState {
    return {
      variables: this.getVariables(),
      callStack: this.getCallStack(),
      heapAllocations: this.getHeapState(),
      pointerGraph: this.getPointerGraph(),
      stackPointer: this.addressToHex(this.stackPointer),
      heapPointer: this.addressToHex(this.heapPointer),
      staticPointer: this.addressToHex(this.staticPointer)
    };
  }

  private formatVariable(location: MemoryLocation): any {
    return {
      address: this.addressToHex(location.address),
      size: location.size,
      value: location.value,
      type: location.type,
      region: location.region,
      name: location.name,
      isPointer: location.isPointer,
      pointerTarget: location.pointerTarget ? this.addressToHex(location.pointerTarget) : undefined,
      allocationId: location.allocationId
    };
  }

  private addressToHex(address: number): string {
    return `0x${address.toString(16).padStart(8, '0')}`;
  }

  private updatePointerRelationship(pointerAddr: number, targetAddr: number): void {
    // This would maintain bidirectional pointer relationships
    // For simplicity, we're just storing the target address
  }

  private removePointerRelationship(pointerAddr: number, targetAddr: number): void {
    // Remove pointer relationship
  }

  private getDefaultValue(typeName: string): any {
    if (typeName === 'int') return 0;
    if (typeName === 'float') return 0.0;
    if (typeName === 'char') return '\0';
    if (typeName === 'bool') return false;
    if (typeName === 'string') return "";
    if (typeName.includes('ptr')) return null;
    return null;
  }

  private trackMemoryChange(changeType: string, data: any): void {
    const change = {
      type: changeType,
      data,
      timestamp: Date.now()
    };
    this.memoryChanges.push(change);

    // Keep only recent changes to avoid memory bloat
    if (this.memoryChanges.length > 1000) {
      this.memoryChanges = this.memoryChanges.slice(-500);
    }
  }

  // Helper method to get type size
  getTypeSize(typeName: string): number {
    const sizes: Record<string, number> = {
      'int': 4,
      'float': 4,
      'char': 1,
      'bool': 1,
      'string': 8,
      'ptr': 8
    };
    return sizes[typeName] || 4;
  }
}