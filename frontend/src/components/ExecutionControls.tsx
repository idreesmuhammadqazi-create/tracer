import React from 'react';
import { Play, Pause, StepForward, Square, RotateCcw, Download } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

export const ExecutionControls: React.FC = () => {
  const { state, actions } = useWebSocket();

  const handleRun = () => {
    if (state.execution.status === 'idle' || state.execution.status === 'finished') {
      actions.startExecution(state.editor.code, state.editor.breakpoints.map(bp => bp.line));
    }
  };

  const handleStep = () => {
    if (state.execution.status === 'paused' || state.execution.status === 'running') {
      actions.stepExecution();
    }
  };

  const handleContinue = () => {
    if (state.execution.status === 'paused') {
      actions.continueExecution(state.editor.breakpoints.map(bp => bp.line));
    }
  };

  const handleStop = () => {
    if (state.execution.status !== 'idle') {
      actions.resetExecution();
    }
  };

  const handleReset = () => {
    actions.resetExecution();
  };

  const handleExportCpp = () => {
    actions.exportToCpp(state.editor.code);
  };

  const isRunning = state.execution.status === 'running';
  const isPaused = state.execution.status === 'paused';
  const isFinished = state.execution.status === 'finished';
  const canRun = state.execution.status === 'idle' || isFinished;
  const canStep = isPaused || isRunning;
  const canContinue = isPaused;
  const canStop = state.execution.status !== 'idle';

  return (
    <div className="execution-controls">
      <div className="controls-row">
        <div className="button-group">
          <button
            onClick={handleRun}
            disabled={!canRun || !state.connected}
            className="control-button run-button"
            title="Run (F5)"
          >
            <Play size={16} />
            Run
          </button>

          <button
            onClick={handleStep}
            disabled={!canStep || !state.connected}
            className="control-button step-button"
            title="Step (F10)"
          >
            <StepForward size={16} />
            Step
          </button>

          <button
            onClick={handleContinue}
            disabled={!canContinue || !state.connected}
            className="control-button continue-button"
            title="Continue (F5)"
          >
            <Pause size={16} />
            Continue
          </button>

          <button
            onClick={handleStop}
            disabled={!canStop || !state.connected}
            className="control-button stop-button"
            title="Stop (Shift+F5)"
          >
            <Square size={16} />
            Stop
          </button>

          <button
            onClick={handleReset}
            className="control-button reset-button"
            title="Reset (Ctrl+Shift+F5)"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>

        <div className="status-indicator">
          <div className={`status-dot ${state.connected ? 'connected' : 'disconnected'}`} />
          <span className="status-text">
            {state.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="execution-status">
        <div className="status-row">
          <span className="status-label">Status:</span>
          <span className={`status-value status-${state.execution.status}`}>
            {state.execution.status.charAt(0).toUpperCase() + state.execution.status.slice(1)}
          </span>
        </div>

        {state.execution.currentLine > 0 && (
          <div className="status-row">
            <span className="status-label">Line:</span>
            <span className="status-value">{state.execution.currentLine}</span>
          </div>
        )}

        {state.execution.error && (
          <div className="status-row error">
            <span className="status-label">Error:</span>
            <span className="status-value error-text">{state.execution.error}</span>
          </div>
        )}
      </div>

      <div className="export-controls">
        <button
          onClick={handleExportCpp}
          disabled={!state.connected}
          className="control-button export-button"
          title="Export to C++"
        >
          <Download size={16} />
          Export C++
        </button>
      </div>

      <style jsx>{`
        .execution-controls {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 12px;
          background-color: #2d2d30;
          border-bottom: 1px solid #3e3e42;
        }

        .controls-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .button-group {
          display: flex;
          gap: 8px;
        }

        .control-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: none;
          border-radius: 4px;
          background-color: #0e639c;
          color: white;
          font-size: 13px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .control-button:hover:not(:disabled) {
          background-color: #1177bb;
        }

        .control-button:disabled {
          background-color: #3e3e42;
          color: #6e6e72;
          cursor: not-allowed;
        }

        .run-button {
          background-color: #388a34;
        }

        .run-button:hover:not(:disabled) {
          background-color: #4ca34a;
        }

        .step-button {
          background-color: #0067c0;
        }

        .step-button:hover:not(:disabled) {
          background-color: #1e7ed8;
        }

        .continue-button {
          background-color: #d99c04;
        }

        .continue-button:hover:not(:disabled) {
          background-color: #f6b93b;
        }

        .stop-button {
          background-color: #c93c37;
        }

        .stop-button:hover:not(:disabled) {
          background-color: #e84844;
        }

        .reset-button {
          background-color: #6e6e72;
        }

        .reset-button:hover:not(:disabled) {
          background-color: #8a8a8a;
        }

        .export-button {
          background-color: #6a5acd;
        }

        .export-button:hover:not(:disabled) {
          background-color: #7b68ee;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-dot.connected {
          background-color: #4ec9b0;
        }

        .status-dot.disconnected {
          background-color: #e74c3c;
        }

        .status-text {
          font-size: 12px;
          color: #cccccc;
        }

        .execution-status {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }

        .status-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-row.error {
          color: #e74c3c;
        }

        .status-label {
          font-size: 12px;
          color: #969696;
          font-weight: 500;
        }

        .status-value {
          font-size: 12px;
          color: #cccccc;
          font-weight: 600;
        }

        .status-value.status-idle {
          color: #969696;
        }

        .status-value.status-running {
          color: #4ec9b0;
        }

        .status-value.status-paused {
          color: #d99c04;
        }

        .status-value.status-finished {
          color: #388a34;
        }

        .status-value.status-error {
          color: #e74c3c;
        }

        .error-text {
          color: #e74c3c;
        }

        .export-controls {
          display: flex;
          justify-content: flex-end;
        }
      `}</style>
    </div>
  );
};