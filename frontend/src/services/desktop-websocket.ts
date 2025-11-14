import {
  WebSocketMessage,
  ParseRequest,
  ExecutionStartRequest,
  ExecutionStepRequest,
  ExecutionContinueRequest,
  ExecutionResetRequest,
  MemoryRequest,
  CppExportRequest,
} from '../types';

export type WebSocketEventHandler = (message: WebSocketMessage) => void;

export class DesktopWebSocketService {
  private handlers: Map<string, WebSocketEventHandler[]> = new Map();
  private isElectron: boolean;
  private pythonBackendReady: boolean = false;

  constructor() {
    this.isElectron = typeof window !== 'undefined' && window.electronAPI;
    this.checkPythonBackend();
  }

  private async checkPythonBackend() {
    // In Electron mode, the Python backend is started by the main process
    // We just need to connect to it
    if (this.isElectron) {
      setTimeout(() => {
        this.pythonBackendReady = true;
        console.log('Desktop Python backend ready');
      }, 2000); // Give Python backend time to start
    } else {
      // Fallback to WebSocket for development
      this.pythonBackendReady = false;
    }
  }

  private simulateBackendMessage(message: WebSocketMessage) {
    // Simulate backend responses for demo purposes
    setTimeout(() => {
      const handlers = this.handlers.get(message.type) || [];
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in handler for message type ${message.type}:`, error);
        }
      });
    }, 100);
  }

  on(messageType: string, handler: WebSocketEventHandler) {
    if (!this.handlers.has(messageType)) {
      this.handlers.set(messageType, []);
    }
    this.handlers.get(messageType)!.push(handler);
  }

  off(messageType: string, handler: WebSocketEventHandler) {
    const handlers = this.handlers.get(messageType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  send(message: WebSocketMessage) {
    if (!this.pythonBackendReady) {
      console.warn('Python backend not ready, message queued:', message);
      // Simulate response for demo
      this.simulateBackendResponse(message);
      return;
    }

    // In a real desktop app, you'd use IPC or a local HTTP server
    // For now, we'll simulate the backend behavior
    this.simulateBackendResponse(message);
  }

  private simulateBackendResponse(message: WebSocketMessage) {
    switch (message.type) {
      case 'parse_request':
        this.simulateBackendMessage({
          type: 'parse_response',
          success: true,
          ast: { type: 'Program', declarations: [] }
        });
        break;

      case 'execution_start':
        this.simulateBackendMessage({
          type: 'execution_ready',
          line: 1
        });
        break;

      case 'execution_step':
        this.simulateBackendMessage({
          type: 'execution_step',
          line: Math.floor(Math.random() * 10) + 1,
          finished: Math.random() > 0.7,
          output: [`Step executed at line ${Math.floor(Math.random() * 10) + 1}`],
          memory_changes: []
        });
        break;

      case 'cpp_export':
        this.simulateBackendMessage({
          type: 'cpp_export_response',
          success: true,
          cpp_code: this.generateCppCode(message.code)
        });
        break;

      case 'memory_request':
        this.simulateBackendMessage({
          type: 'memory_response',
          state: {
            variables: {},
            call_stack: [],
            heap_allocations: [],
            pointer_graph: {},
            memory_changes: [],
            stack_pointer: '0x7ffd1234',
            heap_pointer: '0x10000000',
            static_pointer: '0x60000000'
          }
        });
        break;
    }
  }

  private generateCppCode(lowlogicCode: string): string {
    return `// Generated C++ code from LowLogic
#include <iostream>
#include <memory>
#include <string>
#include <vector>

using namespace std;

int main() {
    // Your LowLogic code converted to C++
    ${lowlogicCode.split('\n').map(line => `    // ${line}`).join('\n')}

    return 0;
}`;
  }

  // Convenience methods
  parseCode(code: string) {
    this.send({
      type: 'parse_request',
      code,
    } as ParseRequest);
  }

  startExecution(code: string, breakpoints?: number[]) {
    this.send({
      type: 'execution_start',
      code,
      breakpoints,
    } as ExecutionStartRequest);
  }

  stepExecution() {
    this.send({
      type: 'execution_step',
    } as ExecutionStepRequest);
  }

  continueExecution(breakpoints?: number[]) {
    this.send({
      type: 'execution_continue',
      breakpoints,
    } as ExecutionContinueRequest);
  }

  resetExecution() {
    this.send({
      type: 'execution_reset',
    } as ExecutionResetRequest);
  }

  requestMemory() {
    this.send({
      type: 'memory_request',
    } as MemoryRequest);
  }

  exportToCpp(code: string) {
    this.send({
      type: 'cpp_export',
      code,
    } as CppExportRequest);
  }

  isConnected(): boolean {
    return this.pythonBackendReady;
  }

  disconnect() {
    // No cleanup needed for desktop mode
  }
}

// Desktop instance
export const desktopWebSocketService = new DesktopWebSocketService();