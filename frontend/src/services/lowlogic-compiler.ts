import { Lexer } from '../compiler/lexer';
import { Parser } from '../compiler/parser';
import { Interpreter } from '../compiler/interpreter';
import { CppGenerator } from '../compiler/cpp-generator';
import { MemoryManager } from '../compiler/memory';
import { Program, ExecutionResult } from '../types/lowlogic-types';

export interface ParseResult {
  success: boolean;
  ast?: Program;
  tokens?: any[];
  error?: string;
  line?: number;
  column?: number;
}

export interface ExecutionState {
  status: 'idle' | 'running' | 'paused' | 'finished' | 'error';
  currentLine: number;
  output: string[];
  memoryState: any;
  variables: Record<string, any>;
  callStack: any[];
  breakpoints: number[];
  error?: string;
}

export class LowLogicCompiler {
  private memoryManager: MemoryManager;
  private interpreter: Interpreter | null = null;
  private currentAST: Program | null = null;
  private executionState: ExecutionState;
  private breakpoints: Set<number> = new Set();

  constructor() {
    this.memoryManager = new MemoryManager();
    this.executionState = {
      status: 'idle',
      currentLine: 0,
      output: [],
      memoryState: {},
      variables: {},
      callStack: [],
      breakpoints: []
    };
  }

  parseCode(code: string): ParseResult {
    try {
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const parser = new Parser(tokens);
      const ast = parser.parse();

      this.currentAST = ast;

      return {
        success: true,
        ast,
        tokens: tokens.map(token => ({
          type: typeof token.type === 'string' ? token.type : String(token.type),
          value: token.value,
          line: token.line,
          column: token.column
        }))
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        line: error.line || 1,
        column: error.column || 1
      };
    }
  }

  startExecution(code: string, breakpoints?: number[]): ExecutionState {
    if (!this.currentAST) {
      const parseResult = this.parseCode(code);
      if (!parseResult.success) {
        this.executionState.status = 'error';
        this.executionState.error = parseResult.error;
        return { ...this.executionState };
      }
    }

    if (breakpoints) {
      this.setBreakpoints(breakpoints);
    }

    this.interpreter = new Interpreter(this.currentAST!, this.memoryManager);
    this.interpreter.reset();
    this.interpreter.setBreakpoints(Array.from(this.breakpoints));

    this.executionState = {
      status: 'running',
      currentLine: 1,
      output: [],
      memoryState: this.memoryManager.getState(),
      variables: this.memoryManager.getVariables(),
      callStack: this.memoryManager.getCallStack(),
      breakpoints: Array.from(this.breakpoints)
    };

    return { ...this.executionState };
  }

  stepExecution(): ExecutionState {
    if (!this.interpreter) {
      this.executionState.status = 'error';
      this.executionState.error = 'No active execution';
      return { ...this.executionState };
    }

    try {
      const result = this.interpreter.step();

      this.executionState.status = result.finished ? 'finished' : 'paused';
      this.executionState.currentLine = result.line || 0;
      this.executionState.output = result.output || [];
      this.executionState.memoryState = this.memoryManager.getState();
      this.executionState.variables = this.memoryManager.getVariables();
      this.executionState.callStack = this.memoryManager.getCallStack();

      if (result.error) {
        this.executionState.status = 'error';
        this.executionState.error = result.error;
      }

      return { ...this.executionState };
    } catch (error: any) {
      this.executionState.status = 'error';
      this.executionState.error = error.message;
      return { ...this.executionState };
    }
  }

  continueExecution(breakpoints?: number[]): ExecutionState {
    if (breakpoints) {
      this.setBreakpoints(breakpoints);
    }

    if (!this.interpreter) {
      this.executionState.status = 'error';
      this.executionState.error = 'No active execution';
      return { ...this.executionState };
    }

    try {
      const result = this.interpreter.continue(Array.from(this.breakpoints));

      this.executionState.status = result.finished ? 'finished' : 'paused';
      this.executionState.currentLine = result.line || 0;
      this.executionState.output = result.output || [];
      this.executionState.memoryState = this.memoryManager.getState();
      this.executionState.variables = this.memoryManager.getVariables();
      this.executionState.callStack = this.memoryManager.getCallStack();

      if (result.error) {
        this.executionState.status = 'error';
        this.executionState.error = result.error;
      }

      return { ...this.executionState };
    } catch (error: any) {
      this.executionState.status = 'error';
      this.executionState.error = error.message;
      return { ...this.executionState };
    }
  }

  resetExecution(): ExecutionState {
    if (this.interpreter) {
      this.interpreter.reset();
    }

    this.executionState = {
      status: 'idle',
      currentLine: 0,
      output: [],
      memoryState: this.memoryManager.getState(),
      variables: this.memoryManager.getVariables(),
      callStack: this.memoryManager.getCallStack(),
      breakpoints: Array.from(this.breakpoints)
    };

    return { ...this.executionState };
  }

  exportToCpp(code: string): { success: boolean; cppCode?: string; error?: string } {
    try {
      const parseResult = this.parseCode(code);
      if (!parseResult.success) {
        return {
          success: false,
          error: parseResult.error
        };
      }

      const generator = new CppGenerator();
      const cppCode = generator.generate(parseResult.ast!);

      return {
        success: true,
        cppCode
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  setBreakpoints(lines: number[]): void {
    this.breakpoints = new Set(lines);
    this.executionState.breakpoints = Array.from(this.breakpoints);

    if (this.interpreter) {
      this.interpreter.setBreakpoints(lines);
    }
  }

  getExecutionState(): ExecutionState {
    return { ...this.executionState };
  }

  getMemoryState(): any {
    return this.memoryManager.getState();
  }

  // Utility methods
  isRunning(): boolean {
    return this.executionState.status === 'running';
  }

  isPaused(): boolean {
    return this.executionState.status === 'paused';
  }

  isFinished(): boolean {
    return this.executionState.status === 'finished';
  }

  hasError(): boolean {
    return this.executionState.status === 'error';
  }

  getOutput(): string[] {
    return [...this.executionState.output];
  }

  getCurrentLine(): number {
    return this.executionState.currentLine;
  }

  getError(): string | undefined {
    return this.executionState.error;
  }
}