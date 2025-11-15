import { LowLogicCompiler, ParseResult, ExecutionState } from './lowlogic-compiler';
import {
  WebSocketMessage,
  ParseResponse,
  ExecutionStateMessage,
  CppExportResponse,
  ErrorMessage
} from '../types';

class EventEmitter {
  private listeners: Map<string, Set<Function>> = new Map();

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

class DesktopWebSocketService {
  private compiler: LowLogicCompiler;
  private eventEmitter: EventEmitter;

  constructor() {
    this.compiler = new LowLogicCompiler();
    this.eventEmitter = new EventEmitter();
  }

  // Event management methods
  on(event: string, callback: (data: any) => void): void {
    this.eventEmitter.on(event, callback);
  }

  off(event: string, callback: (data: any) => void): void {
    this.eventEmitter.off(event, callback);
  }

  // Core operations (called by useDesktopApp.ts)
  parseCode(code: string): void {
    try {
      const result: ParseResult = this.compiler.parseCode(code);

      const response: ParseResponse = {
        type: 'parse_response',
        success: result.success,
        ast: result.ast,
        tokens: result.tokens?.map(token => ({
          type: typeof token.type === 'string' ? token.type : String(token.type),
          value: token.value,
          line: token.line,
          column: token.column
        })),
        error: result.error,
        line: result.line,
        column: result.column
      };

      this.eventEmitter.emit('parse_response', response);
    } catch (error: any) {
      const response: ParseResponse = {
        type: 'parse_response',
        success: false,
        error: error.message || 'Unknown parsing error',
        line: error.line || 1,
        column: error.column || 1
      };
      this.eventEmitter.emit('parse_response', response);
    }
  }

  startExecution(code: string, breakpoints?: number[]): void {
    try {
      const result: ExecutionState = this.compiler.startExecution(code, breakpoints);

      const response: ExecutionStateMessage = {
        type: 'execution_ready',
        line: result.currentLine,
        finished: result.status === 'finished',
        output: result.output,
        memory_state: result.memoryState,
        variables: result.variables,
        call_stack: result.callStack,
        reason: result.error
      };

      this.eventEmitter.emit('execution_ready', response);

      // If execution finished immediately, also emit execution_step
      if (result.status === 'finished') {
        this.eventEmitter.emit('execution_step', response);
      }
    } catch (error: any) {
      const errorMessage: ErrorMessage = {
        type: 'error',
        error: error.message || 'Unknown execution error'
      };
      this.eventEmitter.emit('error', errorMessage);
    }
  }

  stepExecution(): void {
    try {
      const result: ExecutionState = this.compiler.stepExecution();

      const response: ExecutionStateMessage = {
        type: 'execution_step',
        line: result.currentLine,
        finished: result.status === 'finished',
        output: result.output,
        memory_state: result.memoryState,
        variables: result.variables,
        call_stack: result.callStack,
        reason: result.error
      };

      this.eventEmitter.emit('execution_step', response);
    } catch (error: any) {
      const errorMessage: ErrorMessage = {
        type: 'error',
        error: error.message || 'Unknown execution error'
      };
      this.eventEmitter.emit('error', errorMessage);
    }
  }

  continueExecution(breakpoints?: number[]): void {
    try {
      const result: ExecutionState = this.compiler.continueExecution(breakpoints);

      const response: ExecutionStateMessage = {
        type: 'execution_paused',
        line: result.currentLine,
        finished: result.status === 'finished',
        output: result.output,
        memory_state: result.memoryState,
        variables: result.variables,
        call_stack: result.callStack,
        reason: result.error
      };

      this.eventEmitter.emit('execution_paused', response);
    } catch (error: any) {
      const errorMessage: ErrorMessage = {
        type: 'error',
        error: error.message || 'Unknown execution error'
      };
      this.eventEmitter.emit('error', errorMessage);
    }
  }

  resetExecution(): void {
    try {
      const result: ExecutionState = this.compiler.resetExecution();

      const response: ExecutionStateMessage = {
        type: 'execution_ready',
        line: result.currentLine,
        finished: false,
        output: result.output,
        memory_state: result.memoryState,
        variables: result.variables,
        call_stack: result.callStack,
        reason: undefined
      };

      this.eventEmitter.emit('execution_ready', response);
    } catch (error: any) {
      const errorMessage: ErrorMessage = {
        type: 'error',
        error: error.message || 'Unknown reset error'
      };
      this.eventEmitter.emit('error', errorMessage);
    }
  }

  exportToCpp(code: string): void {
    try {
      const result = this.compiler.exportToCpp(code);

      const response: CppExportResponse = {
        type: 'cpp_export_response',
        success: result.success,
        cpp_code: result.cppCode,
        error: result.error,
        line: undefined,
        column: undefined
      };

      this.eventEmitter.emit('cpp_export_response', response);
    } catch (error: any) {
      const response: CppExportResponse = {
        type: 'cpp_export_response',
        success: false,
        error: error.message || 'Unknown export error',
        line: undefined,
        column: undefined
      };
      this.eventEmitter.emit('cpp_export_response', response);
    }
  }

  // Additional methods for direct access to compiler if needed
  getCompiler(): LowLogicCompiler {
    return this.compiler;
  }

  getState() {
    return {
      executionState: this.compiler.getExecutionState(),
      memoryState: this.compiler.getMemoryState()
    };
  }
}

// Export as singleton
export const desktopWebSocketService = new DesktopWebSocketService();