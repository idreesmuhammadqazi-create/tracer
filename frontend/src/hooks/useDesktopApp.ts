import { useEffect, useState, useCallback } from 'react';
import { desktopWebSocketService } from '../services/desktop-websocket';
import {
  WebSocketMessage,
  ParseResponse,
  ExecutionStateMessage,
  MemoryResponse,
  CppExportResponse,
  ErrorMessage,
  AppState,
  EditorState,
  ExecutionState,
  MemoryVisualizationState,
  Breakpoint,
  EditorError,
} from '../types';

const initialEditorState: EditorState = {
  code: '',
  cursorPosition: { line: 0, column: 0 },
  breakpoints: [],
  currentLine: 0,
  errors: [],
};

const initialExecutionState: ExecutionState = {
  status: 'idle',
  currentLine: 0,
  output: [],
};

const initialMemoryState: MemoryVisualizationState = {
  showPointers: true,
  showHexView: false,
};

const initialState: AppState = {
  editor: initialEditorState,
  execution: initialExecutionState,
  memory: initialMemoryState,
  connected: true, // Always true in desktop mode
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

export const useDesktopApp = () => {
  const [state, setState] = useState<AppState>(initialState);

  // Update state helper
  const updateState = useCallback((updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const updateEditor = useCallback((updates: Partial<EditorState>) => {
    setState(prev => ({
      ...prev,
      editor: { ...prev.editor, ...updates }
    }));
  }, []);

  const updateExecution = useCallback((updates: Partial<ExecutionState>) => {
    setState(prev => ({
      ...prev,
      execution: { ...prev.execution, ...updates }
    }));
  }, []);

  // WebSocket message handlers
  useEffect(() => {
    const handleParseResponse = (message: ParseResponse) => {
      if (!message.success && message.error) {
        const error: EditorError = {
          line: message.line || 1,
          column: message.column || 1,
          message: message.error,
          severity: 'error'
        };
        updateEditor({ errors: [error] });
      } else {
        updateEditor({ errors: [] });
      }
    };

    const handleExecutionState = (message: ExecutionStateMessage) => {
      updateExecution({
        status: message.finished ? 'finished' : 'paused',
        currentLine: message.line || 0,
        output: message.output || [],
        error: undefined,
      });

      if (message.finished) {
        updateEditor({ currentLine: -1 });
      } else {
        updateEditor({ currentLine: message.line || 0 });
      }
    };

    const handleCppExport = (message: CppExportResponse) => {
      if (message.success && message.cpp_code) {
        updateState({ cppCode: message.cpp_code });
        handleFileSave(message.cpp_code, 'cpp');
      } else if (message.error) {
        console.error('C++ export failed:', message.error);
      }
    };

    const handleError = (message: ErrorMessage) => {
      updateExecution({
        status: 'error',
        error: message.error,
      });
    };

    // Register event handlers
    desktopWebSocketService.on('parse_response', handleParseResponse);
    desktopWebSocketService.on('execution_ready', handleExecutionState);
    desktopWebSocketService.on('execution_step', handleExecutionState);
    desktopWebSocketService.on('execution_paused', handleExecutionState);
    desktopWebSocketService.on('cpp_export_response', handleCppExport);
    desktopWebSocketService.on('error', handleError);

    // Initialize with default code
    if (!state.editor.code.trim()) {
      updateEditor({ code: defaultCode });
      desktopWebSocketService.parseCode(defaultCode);
    }

    // Cleanup
    return () => {
      desktopWebSocketService.off('parse_response', handleParseResponse);
      desktopWebSocketService.off('execution_ready', handleExecutionState);
      desktopWebSocketService.off('execution_step', handleExecutionState);
      desktopWebSocketService.off('execution_paused', handleExecutionState);
      desktopWebSocketService.off('cpp_export_response', handleCppExport);
      desktopWebSocketService.off('error', handleError);
    };
  }, []);

  // File operations
  const handleFileSave = useCallback(async (content: string, type: 'lowlogic' | 'cpp' = 'lowlogic') => {
    if (window.electronAPI) {
      try {
        let result;
        if (type === 'cpp') {
          result = await window.electronAPI.showExportDialog();
        } else {
          result = await window.electronAPI.showSaveDialog();
        }

        if (!result.canceled) {
          await window.electronAPI.saveFile(content, result.filePath);
          return true;
        }
      } catch (error) {
        console.error('Save failed:', error);
      }
    }
    return false;
  }, []);

  // Action methods
  const parseCode = useCallback((code: string) => {
    updateEditor({ code });
    desktopWebSocketService.parseCode(code);
  }, [updateEditor]);

  const startExecution = useCallback((code: string, breakpoints?: number[]) => {
    updateExecution({ status: 'running', output: [], error: undefined });
    desktopWebSocketService.startExecution(code, breakpoints);
  }, [updateExecution]);

  const stepExecution = useCallback(() => {
    if (state.execution.status === 'paused' || state.execution.status === 'running') {
      updateExecution({ status: 'running' });
      desktopWebSocketService.stepExecution();
    }
  }, [state.execution.status, updateExecution]);

  const continueExecution = useCallback((breakpoints?: number[]) => {
    if (state.execution.status === 'paused') {
      updateExecution({ status: 'running' });
      desktopWebSocketService.continueExecution(breakpoints);
    }
  }, [state.execution.status, updateExecution]);

  const resetExecution = useCallback(() => {
    updateExecution(initialExecutionState);
    updateEditor({ currentLine: 0 });
    desktopWebSocketService.resetExecution();
  }, [updateExecution, updateEditor]);

  const exportToCpp = useCallback((code: string) => {
    desktopWebSocketService.exportToCpp(code);
  }, []);

  const saveFile = useCallback(() => {
    handleFileSave(state.editor.code, 'lowlogic');
  }, [state.editor.code, handleFileSave]);

  const toggleBreakpoint = useCallback((line: number) => {
    const existingBreakpoint = state.editor.breakpoints.find(bp => bp.line === line);

    if (existingBreakpoint) {
      updateEditor({
        breakpoints: state.editor.breakpoints.filter(bp => bp.line !== line)
      });
    } else {
      const newBreakpoint: Breakpoint = { line, enabled: true };
      updateEditor({
        breakpoints: [...state.editor.breakpoints, newBreakpoint]
      });
    }
  }, [state.editor.breakpoints, updateEditor]);

  const setCursor = useCallback((position: { line: number; column: number }) => {
    updateEditor({ cursorPosition: position });
  }, [updateEditor]);

  const clearErrors = useCallback(() => {
    updateEditor({ errors: [] });
  }, [updateEditor]);

  return {
    state,
    actions: {
      parseCode,
      startExecution,
      stepExecution,
      continueExecution,
      resetExecution,
      exportToCpp,
      saveFile,
      toggleBreakpoint,
      setCursor,
      clearErrors,
    },
  };
};