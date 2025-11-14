import React, { useEffect, useRef } from 'react';
import { useLowLogicCompiler } from '../hooks/useLowLogicCompiler';

export const ConsoleOutput: React.FC = () => {
  const { state, actions } = useLowLogicCompiler();
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new output is added
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.execution.output]);

  const clearConsole = () => {
    actions.resetExecution();
  };

  return (
    <div className="console-output">
      <div className="console-header">
        <h4>Console Output</h4>
        <div className="console-controls">
          <button
            onClick={clearConsole}
            className="clear-button"
            title="Clear Console"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="console-content">
        {state.execution.output.length === 0 ? (
          <div className="console-placeholder">
            No output yet. Run your code to see results here.
          </div>
        ) : (
          <div className="console-lines">
            {state.execution.output.map((line, index) => (
              <div key={index} className="console-line">
                <span className="line-number">{index + 1}</span>
                <span className="line-content">{line}</span>
              </div>
            ))}
            <div ref={consoleEndRef} />
          </div>
        )}
      </div>

      <style jsx>{`
        .console-output {
          display: flex;
          flex-direction: column;
          height: 200px;
          background-color: #1e1e1e;
          border-top: 1px solid #3e3e42;
        }

        .console-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background-color: #2d2d30;
          border-bottom: 1px solid #3e3e42;
        }

        .console-header h4 {
          margin: 0;
          font-size: 13px;
          color: #cccccc;
        }

        .console-controls {
          display: flex;
          gap: 8px;
        }

        .clear-button {
          padding: 4px 8px;
          border: 1px solid #3e3e42;
          border-radius: 3px;
          background-color: #3e3e42;
          color: #cccccc;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .clear-button:hover {
          background-color: #4e4e52;
          border-color: #5e5e62;
        }

        .console-content {
          flex: 1;
          overflow-y: auto;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 12px;
        }

        .console-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #6e6e72;
          font-style: italic;
        }

        .console-lines {
          padding: 8px 12px;
        }

        .console-line {
          display: flex;
          align-items: flex-start;
          margin-bottom: 2px;
          line-height: 1.4;
        }

        .line-number {
          color: #858585;
          margin-right: 12px;
          min-width: 30px;
          text-align: right;
          user-select: none;
        }

        .line-content {
          color: #cccccc;
          white-space: pre-wrap;
          word-break: break-word;
          flex: 1;
        }

        /* Custom scrollbar */
        .console-content::-webkit-scrollbar {
          width: 8px;
        }

        .console-content::-webkit-scrollbar-track {
          background-color: #1e1e1e;
        }

        .console-content::-webkit-scrollbar-thumb {
          background-color: #424245;
          border-radius: 4px;
        }

        .console-content::-webkit-scrollbar-thumb:hover {
          background-color: #4e4e52;
        }
      `}</style>
    </div>
  );
};