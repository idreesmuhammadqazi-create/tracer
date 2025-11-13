import { useEffect, useState, useCallback } from 'react';
import { webSocketService } from '../services/websocket';
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
  connected: false,
};

export const useWebSocket = () => {
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

  const updateMemory = useCallback((updates: Partial<MemoryVisualizationState>) => {
    setState(prev => ({
      ...prev,
      memory: { ...prev.memory, ...updates }
    }));
  }, []);

  // WebSocket message handlers
  useEffect(() => {
    const handleConnectionEstablished = (message: WebSocketMessage) => {
      updateState({ connected: true });
    };

    const handleParseResponse = (message: ParseResponse) => {
      if (!message.success && message.error) {
        // Add parsing errors to editor
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

      if (message.memory_state) {
        // Memory state is handled separately
      }
    };

    const handleMemoryResponse = (message: MemoryResponse) => {
      // Memory state can be handled here if needed
      console.log('Memory state received:', message.state);
    };

    const handleCppExport = (message: CppExportResponse) => {
      if (message.success && message.cpp_code) {
        updateState({ cppCode: message.cpp_code });
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
    webSocketService.on('connection_established', handleConnectionEstablished);
    webSocketService.on('parse_response', handleParseResponse);
    webSocketService.on('execution_ready', handleExecutionState);
    webSocketService.on('execution_step', handleExecutionState);
    webSocketService.on('execution_paused', handleExecutionState);
    webSocketService.on('memory_response', handleMemoryResponse);
    webSocketService.on('cpp_export_response', handleCppExport);
    webSocketService.on('error', handleError);

    // Cleanup
    return () => {
      webSocketService.off('connection_established', handleConnectionEstablished);
      webSocketService.off('parse_response', handleParseResponse);
      webSocketService.off('execution_ready', handleExecutionState);
      webSocketService.off('execution_step', handleExecutionState);
      webSocketService.off('execution_paused', handleExecutionState);
      webSocketService.off('memory_response', handleMemoryResponse);
      webSocketService.off('cpp_export_response', handleCppExport);
      webSocketService.off('error', handleError);
    };
  }, [updateState, updateEditor, updateExecution]);

  // Action methods
  const parseCode = useCallback((code: string) => {
    updateEditor({ code });
    webSocketService.parseCode(code);
  }, [updateEditor]);

  const startExecution = useCallback((code: string, breakpoints?: number[]) => {
    updateExecution({ status: 'running', output: [], error: undefined });
    webSocketService.startExecution(code, breakpoints);
  }, [updateExecution]);

  const stepExecution = useCallback(() => {
    if (state.execution.status === 'paused' || state.execution.status === 'running') {
      updateExecution({ status: 'running' });
      webSocketService.stepExecution();
    }
  }, [state.execution.status, updateExecution]);

  const continueExecution = useCallback((breakpoints?: number[]) => {
    if (state.execution.status === 'paused') {
      updateExecution({ status: 'running' });
      webSocketService.continueExecution(breakpoints);
    }
  }, [state.execution.status, updateExecution]);

  const resetExecution = useCallback(() => {
    updateExecution(initialExecutionState);
    updateEditor({ currentLine: 0 });
    webSocketService.resetExecution();
  }, [updateExecution, updateEditor]);

  const exportToCpp = useCallback((code: string) => {
    webSocketService.exportToCpp(code);
  }, []);

  const toggleBreakpoint = useCallback((line: number) => {
    const existingBreakpoint = state.editor.breakpoints.find(bp => bp.line === line);

    if (existingBreakpoint) {
      // Remove breakpoint
      updateEditor({
        breakpoints: state.editor.breakpoints.filter(bp => bp.line !== line)
      });
    } else {
      // Add breakpoint
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
      toggleBreakpoint,
      setCursor,
      clearErrors,
    },
  };
};