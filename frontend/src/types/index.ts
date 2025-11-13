// WebSocket message types
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

// Request messages
export interface ParseRequest extends WebSocketMessage {
  type: 'parse_request';
  code: string;
}

export interface ExecutionStartRequest extends WebSocketMessage {
  type: 'execution_start';
  code: string;
  breakpoints?: number[];
}

export interface ExecutionStepRequest extends WebSocketMessage {
  type: 'execution_step';
}

export interface ExecutionContinueRequest extends WebSocketMessage {
  type: 'execution_continue';
  breakpoints?: number[];
}

export interface ExecutionResetRequest extends WebSocketMessage {
  type: 'execution_reset';
}

export interface MemoryRequest extends WebSocketMessage {
  type: 'memory_request';
}

export interface CppExportRequest extends WebSocketMessage {
  type: 'cpp_export';
  code: string;
}

// Response messages
export interface ParseResponse extends WebSocketMessage {
  type: 'parse_response';
  success: boolean;
  ast?: any;
  tokens?: any[];
  error?: string;
  line?: number;
  column?: number;
}

export interface ExecutionStateMessage extends WebSocketMessage {
  type: 'execution_ready' | 'execution_step' | 'execution_paused';
  line?: number;
  finished?: boolean;
  output?: string[];
  memory_changes?: any[];
  memory_state?: MemoryState;
  variables?: Record<string, VariableInfo>;
  call_stack?: CallStackFrame[];
  reason?: string;
}

export interface MemoryResponse extends WebSocketMessage {
  type: 'memory_response';
  state: MemoryState;
}

export interface CppExportResponse extends WebSocketMessage {
  type: 'cpp_export_response';
  success: boolean;
  cpp_code?: string;
  error?: string;
  line?: number;
  column?: number;
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  error: string;
}

// Memory and execution state types
export interface MemoryState {
  variables: Record<string, VariableInfo>;
  call_stack: CallStackFrame[];
  heap_allocations: HeapAllocation[];
  pointer_graph: Record<string, string[]>;
  memory_changes: MemoryChange[];
  stack_pointer: string;
  heap_pointer: string;
  static_pointer: string;
}

export interface VariableInfo {
  address: string;
  size: number;
  value: any;
  type: string;
  region: 'stack' | 'heap' | 'static' | 'code';
  name?: string;
  is_pointer: boolean;
  pointer_target?: string;
  allocation_id?: string;
}

export interface CallStackFrame {
  function_name: string;
  return_address: string;
  base_pointer: string;
  local_variables: Record<string, VariableInfo>;
  parameters: Record<string, VariableInfo>;
}

export interface HeapAllocation {
  allocation_id: string;
  address: string;
  size: number;
  data: number[];
  is_freed: boolean;
  ref_count: number;
}

export interface MemoryChange {
  type: string;
  data: any;
  timestamp: number;
}

// Token types from lexer
export interface Token {
  type: string;
  value: string;
  line: number;
  column: number;
}

// Breakpoint management
export interface Breakpoint {
  line: number;
  enabled: boolean;
  condition?: string;
}

// UI state types
export interface EditorState {
  code: string;
  cursorPosition: { line: number; column: number };
  breakpoints: Breakpoint[];
  currentLine: number;
  errors: EditorError[];
}

export interface EditorError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ExecutionState {
  status: 'idle' | 'running' | 'paused' | 'finished' | 'error';
  currentLine: number;
  output: string[];
  error?: string;
}

export interface MemoryVisualizationState {
  selectedAddress?: string;
  hoveredAddress?: string;
  showPointers: boolean;
  showHexView: boolean;
  filterType?: string;
}

// Application state
export interface AppState {
  editor: EditorState;
  execution: ExecutionState;
  memory: MemoryVisualizationState;
  connected: boolean;
  cppCode?: string;
}