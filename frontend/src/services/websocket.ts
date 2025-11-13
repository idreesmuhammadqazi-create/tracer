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

export class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: Map<string, WebSocketEventHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  constructor(private url: string = 'ws://localhost:8765') {
    this.connect();
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
        resolve();
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.isConnecting = false;
          this.ws = null;
          this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  private handleMessage(message: WebSocketMessage) {
    const handlers = this.handlers.get(message.type) || [];
    handlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error(`Error in handler for message type ${message.type}:`, error);
      }
    });
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
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
      // Try to reconnect and send the message
      this.connect().then(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(message));
        }
      });
    }
  }

  // Convenience methods for specific message types
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
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();