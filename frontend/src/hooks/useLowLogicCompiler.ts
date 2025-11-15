import { useState, useCallback, useEffect } from 'react';
import { LowLogicCompiler, ExecutionState, ParseResult } from '../services/lowlogic-compiler';
import { AppState, EditorState, ExecutionState as ExecState, MemoryVisualizationState, Breakpoint, EditorError } from '../types';

const initialEditorState: EditorState = {
  code: '',
  cursorPosition: { line: 0, column: 0 },
  breakpoints: [],
  currentLine: 0,
  errors: [],
};

const initialExecutionState: ExecState = {
  status: 'idle',
  currentLine: 0,
  output: [],
};

const initialMemoryState: MemoryVisualizationState = {
  showPointers: true,
  showHexView: false,
};

const defaultCode = `// Welcome to LowLogic - A traceable low-level mode
// Try running this example code step by step!

int a = 5;
ptr<int> b = &a;
*b = 10;
print(a);

// Array example
int arr[3] = {1, 2, 3};
print(arr[0]);
print(arr[1]);
print(arr[2]);

// Pointer arithmetic example
ptr<int> ptr_to_arr = arr;
*(ptr_to_arr + 1) = 42;
print(arr[1]);

// Control flow example
int x = 10;
if (x > 5) {
    print("x is greater than 5");
} else {
    print("x is not greater than 5");
}

// Loop example
int i = 0;
while (i < 3) {
    print(i);
    i = i + 1;
}`;

export const useLowLogicCompiler = () => {
  const [compiler] = useState(() => new LowLogicCompiler());
  const [state, setState] = useState<AppState>({
    editor: initialEditorState,
    execution: initialExecutionState,
    memory: initialMemoryState,
    connected: true, // Always true in frontend-only mode
    cppCode: undefined
  });

  // Update state helpers
  const updateEditor = useCallback((updates: Partial<EditorState>) => {
    setState(prev => ({
      ...prev,
      editor: { ...prev.editor, ...updates }
    }));
  }, []);

  const updateExecution = useCallback((updates: Partial<ExecState>) => {
    setState(prev => ({
      ...prev,
      execution: { ...prev.execution, ...updates }
    }));
  }, []);

  const updateMemory = useCallback((updates: Partial<MemoryVisualizationState>) => {
    setState(prev => ({
      ...prev,
      memory: { ...prev.memory, ...updates }
    }));
  }, []);

  // Initialize with default code
  useEffect(() => {
    if (!state.editor.code.trim()) {
      parseCode(defaultCode);
    }
  }, []);

  // Core compiler actions
  const parseCode = useCallback((code: string) => {
    updateEditor({ code });

    const parseResult = compiler.parseCode(code);

    if (parseResult.success) {
      updateEditor({ errors: [] });
    } else {
      const error: EditorError = {
        line: parseResult.line || 1,
        column: parseResult.column || 1,
        message: parseResult.error || 'Unknown error',
        severity: 'error'
      };
      updateEditor({ errors: [error] });
    }
  }, [updateEditor]);

  const startExecution = useCallback((code: string, breakpoints?: number[]) => {
    const execState = compiler.startExecution(code, breakpoints);

    updateExecution({
      status: execState.status as ExecState['status'],
      currentLine: execState.currentLine,
      output: execState.output,
      error: execState.error
    });

    updateMemory({ ...compiler.getMemoryState() });
  }, [updateExecution, updateMemory]);

  const stepExecution = useCallback(() => {
    if (compiler.isRunning() || compiler.isPaused()) {
      updateExecution({ status: 'running' as ExecState['status'] });

      const execState = compiler.stepExecution();

      updateExecution({
        status: execState.status as ExecState['status'],
        currentLine: execState.currentLine,
        output: execState.output,
        error: execState.error
      });

      updateEditor({ currentLine: execState.currentLine });
      updateMemory({ ...compiler.getMemoryState() });
    }
  }, [compiler, updateExecution, updateEditor, updateMemory]);

  const continueExecution = useCallback((breakpoints?: number[]) => {
    if (compiler.isPaused()) {
      updateExecution({ status: 'running' as ExecState['status'] });

      const execState = compiler.continueExecution(breakpoints);

      updateExecution({
        status: execState.status as ExecState['status'],
        currentLine: execState.currentLine,
        output: execState.output,
        error: execState.error
      });

      updateEditor({ currentLine: execState.currentLine });
      updateMemory({ ...compiler.getMemoryState() });
    }
  }, [compiler, updateExecution, updateEditor, updateMemory]);

  const resetExecution = useCallback(() => {
    const execState = compiler.resetExecution();

    updateExecution({
      status: execState.status as ExecState['status'],
      currentLine: execState.currentLine,
      output: execState.output,
      error: undefined
    });

    updateEditor({ currentLine: 0, errors: [] });
    updateMemory({ ...compiler.getMemoryState() });
  }, [compiler, updateExecution, updateEditor, updateMemory]);

  const exportToCpp = useCallback((code: string) => {
    const result = compiler.exportToCpp(code);

    if (result.success && result.cppCode) {
      setState(prev => ({ ...prev, cppCode: result.cppCode }));
    } else if (result.error) {
      updateExecution({ error: result.error });
    }
  }, [compiler, updateExecution]);

  const toggleBreakpoint = useCallback((line: number) => {
    const existingBreakpoint = state.editor.breakpoints.find(bp => bp.line === line);

    if (existingBreakpoint) {
      // Remove breakpoint
      const newBreakpoints = state.editor.breakpoints.filter(bp => bp.line !== line);
      updateEditor({ breakpoints: newBreakpoints });
      compiler.setBreakpoints(newBreakpoints.map(bp => bp.line));
    } else {
      // Add breakpoint
      const newBreakpoint: Breakpoint = { line, enabled: true };
      const newBreakpoints = [...state.editor.breakpoints, newBreakpoint];
      updateEditor({ breakpoints: newBreakpoints });
      compiler.setBreakpoints(newBreakpoints.map(bp => bp.line));
    }
  }, [state.editor.breakpoints, updateEditor, compiler]);

  const setCursor = useCallback((position: { line: number; column: number }) => {
    updateEditor({ cursorPosition: position });
  }, [updateEditor]);

  const clearErrors = useCallback(() => {
    updateEditor({ errors: [] });
  }, [updateEditor]);

  // Update execution state from compiler
  useEffect(() => {
    const execState = compiler.getExecutionState();
    updateExecution({
      status: execState.status as ExecState['status'],
      currentLine: execState.currentLine,
      output: execState.output,
      error: execState.error
    });
    updateMemory({ ...compiler.getMemoryState() });
  }, [compiler]);

  return {
    state,
    actions: {
      parseCode,
      startExecution,
      stepExecution,
      continueExecution,
      resetExecution,
      exportToCpp,
      toggleBreakpoint,
      setCursor,
      clearErrors,
    },
    compiler, // Expose compiler for advanced usage
  };
};