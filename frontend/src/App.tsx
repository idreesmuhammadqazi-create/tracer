import React, { useState, useCallback } from 'react';
import SplitPane from 'react-split-pane';
import { Play, Pause, StepForward, Square, RotateCcw, Download, Terminal, MemoryStick, Code, Globe, Zap } from 'lucide-react';
import { CodeEditor } from './components/CodeEditor';
import { ExecutionControls } from './components/ExecutionControls';
import { MemoryVisualizer } from './components/MemoryVisualizer';
import { ConsoleOutput } from './components/ConsoleOutput';
import { useLowLogicCompiler } from './hooks/useLowLogicCompiler';

function App() {
  const { state, actions } = useLowLogicCompiler();

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Prevent shortcuts when typing in editor
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'Enter':
        case 'F5':
          event.preventDefault();
          if (state.execution.status === 'idle' || state.execution.status === 'finished') {
            actions.startExecution(state.editor.code, state.editor.breakpoints.map(bp => bp.line));
          } else if (state.execution.status === 'paused') {
            actions.continueExecution(state.editor.breakpoints.map(bp => bp.line));
          }
          break;
        case 'F10':
          event.preventDefault();
          if (state.execution.status === 'paused' || state.execution.status === 'running') {
            actions.stepExecution();
          }
          break;
        case 'Shift':
          if (event.key === 'F5') {
            event.preventDefault();
            actions.resetExecution();
          }
          break;
        case 's':
          event.preventDefault();
          // Save functionality could be added here
          break;
        case 'e':
          event.preventDefault();
          actions.exportToCpp(state.editor.code);
          break;
      }
    }
  }, [state.execution.status, state.editor.code, state.editor.breakpoints, actions]);

  // Set up keyboard shortcuts
  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">
            <Zap size={20} />
            LowLogic
          </h1>
          <span className="app-subtitle">Traceable Low-Level Mode (Browser)</span>
        </div>
        <div className="header-right">
          <div className="connection-status">
            <div className="status-indicator frontend-ready" />
            <span>Browser Ready</span>
          </div>
        </div>
      </header>

      {/* Execution Controls */}
      <ExecutionControls />

      {/* Main Content */}
      <div className="main-content">
        <SplitPane
          split="vertical"
          minSize={400}
          defaultSize="50%"
          className="main-split-pane"
        >
          {/* Left Panel - Code Editor */}
          <div className="left-panel">
            <div className="panel-header">
              <Code size={16} />
              <span>Code Editor</span>
              <div className="header-actions">
                <div className="browser-indicator">
                  <Globe size={14} />
                </div>
              </div>
            </div>
            <div className="panel-content">
              <CodeEditor height="100%" />
            </div>
          </div>

          {/* Right Panel - Memory Visualizer */}
          <SplitPane
            split="horizontal"
            minSize={200}
            defaultSize="70%"
            className="right-split-pane"
          >
            {/* Memory Visualizer */}
            <div className="memory-panel">
              <div className="panel-header">
                <MemoryStick size={16} />
                <span>Memory Inspector</span>
              </div>
              <div className="panel-content">
                <MemoryVisualizer
                  memoryState={state.memory}
                />
              </div>
            </div>

            {/* Console Output */}
            <div className="console-panel">
              <div className="panel-header">
                <Terminal size={16} />
                <span>Console</span>
              </div>
              <div className="panel-content">
                <ConsoleOutput output={state.execution.output} />
              </div>
            </div>
          </SplitPane>
        </SplitPane>
      </div>

      {/* C++ Export Modal */}
      {state.cppCode && (
        <div className="modal-overlay" onClick={() => setState(prev => ({ ...prev, cppCode: undefined }))}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Generated C++ Code</h3>
              <button
                className="close-button"
                onClick={() => setState(prev => ({ ...prev, cppCode: undefined }))}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <pre className="cpp-code">
                <code>{state.cppCode}</code>
              </pre>
            </div>
            <div className="modal-footer">
              <button
                className="copy-button"
                onClick={() => {
                  navigator.clipboard.writeText(state.cppCode);
                  // Simple notification
                  const notification = document.createElement('div');
                  notification.textContent = 'C++ code copied to clipboard!';
                  notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background-color: #4ec9b0;
                    color: white;
                    padding: 12px 16px;
                    border-radius: 4px;
                    z-index: 10000;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                  `;
                  document.body.appendChild(notification);
                  setTimeout(() => document.body.removeChild(notification), 2000);
                }}
              >
                Copy to Clipboard
              </button>
              <button
                className="download-button"
                onClick={() => {
                  const blob = new Blob([state.cppCode], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'generated_code.cpp';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                Download File
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
            sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          overflow: hidden;
          background-color: #0d1117;
        }

        .app {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background-color: #0d1117;
          color: #cccccc;
        }

        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 16px;
          background-color: #1e1e1e;
          border-bottom: 1px solid #333333;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .app-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          color: #cccccc;
        }

        .app-subtitle {
          font-size: 12px;
          color: #969696;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-indicator.frontend-ready {
          background-color: #4ec9b0;
          animation: glow 2s infinite;
        }

        @keyframes glow {
          0% { box-shadow: 0 0 5px rgba(78, 201, 176, 0.5); }
          50% { box-shadow: 0 0 20px rgba(78, 201, 176, 0.8); }
          100% { box-shadow: 0 0 5px rgba(78, 201, 176, 0.5); }
        }

        .main-content {
          flex: 1;
          overflow: hidden;
          background-color: #0d1117;
        }

        .main-split-pane {
          position: relative !important;
        }

        .right-split-pane {
          position: relative !important;
        }

        .left-panel,
        .memory-panel,
        .console-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background-color: #1e1e1e;
          border: 1px solid #333333;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background-color: #252526;
          border-bottom: 1px solid #333333;
          font-size: 13px;
          font-weight: 500;
        }

        .panel-content {
          flex: 1;
          overflow: hidden;
        }

        .header-actions {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .browser-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          background-color: #252526;
          border-radius: 50%;
          border: 1px solid #4ec9b0;
        }

        /* SplitPane overrides */
        .Resizer {
          background-color: #333333;
          opacity: 0.2;
          z-index: 1;
          -moz-box-sizing: border-box;
          -webkit-box-sizing: border-box;
          box-sizing: border-box;
          -moz-background-clip: padding;
          -webkit-background-clip: padding;
          background-clip: padding-box;
        }

        .Resizer:hover {
          -webkit-transition: all 2s ease;
          transition: all 2s ease;
          opacity: 0.5;
        }

        .Resizer.horizontal {
          height: 11px;
          margin: -5px 0;
          border-top: 5px solid rgba(255, 255, 255, 0);
          border-bottom: 5px solid rgba(255, 255, 255, 0);
          cursor: row-resize;
          width: 100%;
        }

        .Resizer.vertical {
          width: 11px;
          margin: 0 -5px;
          border-left: 5px solid rgba(255, 255, 255, 0);
          border-right: 5px solid rgba(255, 255, 255, 0);
          cursor: col-resize;
        }

        /* Modal styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background-color: #1e1e1e;
          border-radius: 8px;
          width: 80%;
          max-width: 800px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          border: 1px solid #333333;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #333333;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 16px;
          color: #cccccc;
        }

        .close-button {
          background: none;
          border: none;
          color: #cccccc;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }

        .close-button:hover {
          background-color: #333333;
        }

        .modal-body {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
        }

        .cpp-code {
          background-color: #0d1117;
          border: 1px solid #333333;
          border-radius: 4px;
          padding: 16px;
          overflow-x: auto;
          font-family: 'Consolas', 'Monaco', 'Menlo', monospace;
          font-size: 13px;
          line-height: 1.4;
          color: #cccccc;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid #333333;
        }

        .copy-button,
        .download-button {
          padding: 8px 16px;
          border: 1px solid #333333;
          border-radius: 4px;
          background-color: #0e639c;
          color: white;
          cursor: pointer;
          font-size: 13px;
          transition: background-color 0.2s;
        }

        .copy-button:hover,
        .download-button:hover {
          background-color: #1177bb;
        }

        .copy-button:active,
        .download-button:active {
          background-color: #0d4f8c;
        }
      `}</style>
    </div>
  );
}

export default App;