import React, { useState, useCallback, useEffect } from 'react';
import SplitPane from 'react-split-pane';
import { Play, Pause, StepForward, Square, RotateCcw, Download, Terminal, MemoryStick, Code, Save, FolderOpen } from 'lucide-react';
import { CodeEditor } from './components/CodeEditor';
import { ExecutionControls } from './components/ExecutionControls';
import { MemoryVisualizer } from './components/MemoryVisualizer';
import { ConsoleOutput } from './components/ConsoleOutput';
import { useDesktopApp } from './hooks/useDesktopApp';

function DesktopApp() {
  const { state, actions } = useDesktopApp();
  const [showCppModal, setShowCppModal] = useState(false);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 's':
          event.preventDefault();
          actions.saveFile();
          break;
        case 'o':
          event.preventDefault();
          // Open file handled by Electron menu
          break;
        case 'e':
          event.preventDefault();
          actions.exportToCpp(state.editor.code);
          break;
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
      }
    }
  }, [state.execution.status, state.editor.code, state.editor.breakpoints, actions]);

  // Set up keyboard shortcuts and Electron menu handlers
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);

    // Electron menu handlers
    if (window.electronAPI) {
      const handleMenuNewFile = () => {
        actions.parseCode('');
      };

      const handleMenuOpenFile = (event, data) => {
        actions.parseCode(data.content);
      };

      const handleMenuSaveFile = () => {
        actions.saveFile();
      };

      const handleMenuSaveAs = () => {
        actions.saveFile();
      };

      const handleMenuExportCpp = () => {
        actions.exportToCpp(state.editor.code);
      };

      const handleMenuRun = () => {
        if (state.execution.status === 'idle' || state.execution.status === 'finished') {
          actions.startExecution(state.editor.code, state.editor.breakpoints.map(bp => bp.line));
        }
      };

      const handleMenuStep = () => {
        if (state.execution.status === 'paused' || state.execution.status === 'running') {
          actions.stepExecution();
        }
      };

      const handleMenuContinue = () => {
        if (state.execution.status === 'paused') {
          actions.continueExecution(state.editor.breakpoints.map(bp => bp.line));
        }
      };

      const handleMenuStop = () => {
        actions.resetExecution();
      };

      const handleMenuReset = () => {
        actions.resetExecution();
      };

      // Register menu handlers
      window.electronAPI.onMenuAction(handleMenuNewFile);
      window.electronAPI.onMenuAction(handleMenuOpenFile);
      window.electronAPI.onMenuAction(handleMenuSaveFile);
      window.electronAPI.onMenuAction(handleMenuSaveAs);
      window.electronAPI.onMenuAction(handleMenuExportCpp);
      window.electronAPI.onMenuAction(handleMenuRun);
      window.electronAPI.onMenuAction(handleMenuStep);
      window.electronAPI.onMenuAction(handleMenuContinue);
      window.electronAPI.onMenuAction(handleMenuStop);
      window.electronAPI.onMenuAction(handleMenuReset);

      return () => {
        window.electronAPI.removeAllListeners();
      };
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, state.execution.status, state.editor.code, state.editor.breakpoints, actions]);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">
            <MemoryStick size={20} />
            LowLogic Desktop
          </h1>
          <span className="app-subtitle">Traceable Low-Level Mode</span>
        </div>
        <div className="header-right">
          <div className="desktop-indicator">
            <div className="status-indicator connected" />
            <span>Desktop Mode</span>
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
                <button
                  onClick={actions.saveFile}
                  className="header-button"
                  title="Save (Ctrl+S)"
                >
                  <Save size={14} />
                </button>
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
                <ConsoleOutput />
              </div>
            </div>
          </SplitPane>
        </SplitPane>
      </div>

      {/* C++ Export Modal */}
      {showCppModal && state.cppCode && (
        <div className="modal-overlay" onClick={() => setShowCppModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Generated C++ Code</h3>
              <button
                className="close-button"
                onClick={() => setShowCppModal(false)}
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
                  navigator.clipboard.writeText(state.cppCode!);
                  alert('C++ code copied to clipboard!');
                }}
              >
                Copy to Clipboard
              </button>
              <button
                className="download-button"
                onClick={() => {
                  const blob = new Blob([state.cppCode!], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'generated_code.cpp';
                  a.click();
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
        }

        .app {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background-color: #1e1e1e;
          color: #cccccc;
        }

        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 16px;
          background-color: #2d2d30;
          border-bottom: 1px solid #3e3e42;
          -webkit-app-region: drag;
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
          -webkit-app-region: no-drag;
        }

        .desktop-indicator {
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

        .status-indicator.connected {
          background-color: #4ec9b0;
        }

        .main-content {
          flex: 1;
          overflow: hidden;
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
          background-color: #252526;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background-color: #2d2d30;
          border-bottom: 1px solid #3e3e42;
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
        }

        .header-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border: none;
          background: none;
          color: #cccccc;
          cursor: pointer;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .header-button:hover {
          background-color: #3e3e42;
        }

        /* SplitPane overrides */
        .Resizer {
          background-color: #3e3e42;
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
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background-color: #2d2d30;
          border-radius: 8px;
          width: 80%;
          max-width: 800px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          border: 1px solid #3e3e42;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #3e3e42;
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
        }

        .close-button:hover {
          background-color: #3e3e42;
          border-radius: 4px;
        }

        .modal-body {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
        }

        .cpp-code {
          background-color: #1e1e1e;
          border: 1px solid #3e3e42;
          border-radius: 4px;
          padding: 16px;
          overflow-x: auto;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 13px;
          line-height: 1.4;
          color: #cccccc;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid #3e3e42;
        }

        .copy-button,
        .download-button {
          padding: 8px 16px;
          border: 1px solid #3e3e42;
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
      `}</style>
    </div>
  );
}

export default DesktopApp;