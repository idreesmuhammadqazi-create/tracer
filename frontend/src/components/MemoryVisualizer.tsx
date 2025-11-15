import React, { useState, useMemo } from 'react';
import { useLowLogicCompiler } from '../hooks/useLowLogicCompiler';
import { MemoryState, VariableInfo, HeapAllocation, CallStackFrame } from '../types';

interface MemoryVisualizerProps {
  className?: string;
}

interface VariableDisplayProps {
  variable: VariableInfo;
  isSelected: boolean;
  onSelect: () => void;
}

const VariableDisplay: React.FC<VariableDisplayProps> = ({ variable, isSelected, onSelect }) => {
  const formatValue = (value: any, type: string): string => {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (type === 'string') {
      return `"${value}"`;
    }
    if (type === 'char') {
      return `'${value}'`;
    }
    if (type === 'bool') {
      return value ? 'true' : 'false';
    }
    return String(value);
  };

  return (
    <div
      className={`variable-item ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="variable-header">
        <span className="variable-name">{variable.name || 'anonymous'}</span>
        <span className="variable-type">{variable.type}</span>
      </div>
      <div className="variable-details">
        <div className="variable-value">
          {formatValue(variable.value, variable.type)}
        </div>
        <div className="variable-address">{variable.address}</div>
      </div>
      {variable.is_pointer && variable.pointer_target && (
        <div className="pointer-info">
          → {variable.pointer_target}
        </div>
      )}
    </div>
  );
};

interface HeapAllocationDisplayProps {
  allocation: HeapAllocation;
  isSelected: boolean;
  onSelect: () => void;
}

const HeapAllocationDisplay: React.FC<HeapAllocationDisplayProps> = ({ allocation, isSelected, onSelect }) => {
  const formatBytes = (bytes: number[]): string => {
    return bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
  };

  return (
    <div
      className={`heap-allocation ${isSelected ? 'selected' : ''} ${allocation.is_freed ? 'freed' : ''}`}
      onClick={onSelect}
    >
      <div className="allocation-header">
        <span className="allocation-id">{allocation.allocation_id.substring(0, 8)}</span>
        <span className="allocation-address">{allocation.address}</span>
        <span className="allocation-size">{allocation.size} bytes</span>
      </div>
      <div className="allocation-data">
        <div className="data-preview">
          {formatBytes(allocation.data.slice(0, 8))}
          {allocation.data.length > 8 && '...'}
        </div>
        <div className="ref-count">Refs: {allocation.ref_count}</div>
      </div>
      {allocation.is_freed && (
        <div className="freed-indicator">FREED</div>
      )}
    </div>
  );
};

interface CallStackDisplayProps {
  callStack: CallStackFrame[];
  selectedFrame?: number;
  onSelectFrame: (index: number) => void;
}

const CallStackDisplay: React.FC<CallStackDisplayProps> = ({ callStack, selectedFrame, onSelectFrame }) => {
  return (
    <div className="call-stack">
      <h4>Call Stack</h4>
      {callStack.length === 0 ? (
        <div className="empty-stack">No active function calls</div>
      ) : (
        <div className="stack-frames">
          {callStack.map((frame, index) => (
            <div
              key={index}
              className={`stack-frame ${selectedFrame === index ? 'selected' : ''}`}
              onClick={() => onSelectFrame(index)}
            >
              <div className="frame-function">{frame.function_name}</div>
              <div className="frame-address">{frame.return_address}</div>
              <div className="frame-base-pointer">BP: {frame.base_pointer}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const MemoryVisualizer: React.FC<MemoryVisualizerProps> = ({ className }) => {
  const { state } = useLowLogicCompiler();
  const memoryState = state.memory;
  const [selectedAddress, setSelectedAddress] = useState<string>();
  const [selectedFrame, setSelectedFrame] = useState<number>();
  const [activeTab, setActiveTab] = useState<'variables' | 'heap' | 'stack'>('variables');

  const variables = useMemo(() => {
    if (!memoryState) return [];
    return Object.entries(memoryState.variables).map(([name, variable]) => ({
      name,
      ...variable
    }));
  }, [memoryState]);

  const heapAllocations = useMemo(() => {
    return memoryState?.heap_allocations || [];
  }, [memoryState]);

  const callStack = useMemo(() => {
    return memoryState?.call_stack || [];
  }, [memoryState]);

  const pointerGraph = useMemo(() => {
    return memoryState?.pointer_graph || {};
  }, [memoryState]);

  const selectedVariable = useMemo(() => {
    if (!selectedAddress) return null;
    return variables.find(v => v.address === selectedAddress) ||
           heapAllocations.find(a => a.address === selectedAddress);
  }, [selectedAddress, variables, heapAllocations]);

  return (
    <div className={`memory-visualizer ${className || ''}`}>
      <div className="memory-header">
        <h3>Memory Inspector</h3>
        <div className="memory-info">
          {memoryState && (
            <>
              <span>Stack: {memoryState.stack_pointer}</span>
              <span>Heap: {memoryState.heap_pointer}</span>
            </>
          )}
        </div>
      </div>

      <div className="memory-tabs">
        <button
          className={`tab-button ${activeTab === 'variables' ? 'active' : ''}`}
          onClick={() => setActiveTab('variables')}
        >
          Variables
        </button>
        <button
          className={`tab-button ${activeTab === 'heap' ? 'active' : ''}`}
          onClick={() => setActiveTab('heap')}
        >
          Heap
        </button>
        <button
          className={`tab-button ${activeTab === 'stack' ? 'active' : ''}`}
          onClick={() => setActiveTab('stack')}
        >
          Call Stack
        </button>
      </div>

      <div className="memory-content">
        {activeTab === 'variables' && (
          <div className="variables-panel">
            {variables.length === 0 ? (
              <div className="empty-state">No variables in scope</div>
            ) : (
              <div className="variables-list">
                {variables.map((variable) => (
                  <VariableDisplay
                    key={variable.address}
                    variable={variable}
                    isSelected={selectedAddress === variable.address}
                    onSelect={() => setSelectedAddress(variable.address)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'heap' && (
          <div className="heap-panel">
            {heapAllocations.length === 0 ? (
              <div className="empty-state">No heap allocations</div>
            ) : (
              <div className="heap-list">
                {heapAllocations.map((allocation) => (
                  <HeapAllocationDisplay
                    key={allocation.allocation_id}
                    allocation={allocation}
                    isSelected={selectedAddress === allocation.address}
                    onSelect={() => setSelectedAddress(allocation.address)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stack' && (
          <div className="stack-panel">
            <CallStackDisplay
              callStack={callStack}
              selectedFrame={selectedFrame}
              onSelectFrame={setSelectedFrame}
            />
          </div>
        )}
      </div>

      {selectedVariable && (
        <div className="selected-details">
          <h4>Selected Memory</h4>
          <div className="details-content">
            <div className="detail-row">
              <span className="detail-label">Address:</span>
              <span className="detail-value">{selectedVariable.address}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Size:</span>
              <span className="detail-value">{selectedVariable.size} bytes</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Type:</span>
              <span className="detail-value">{selectedVariable.type}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Region:</span>
              <span className="detail-value">{selectedVariable.region}</span>
            </div>
            {(selectedVariable as VariableInfo).name && (
              <div className="detail-row">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{(selectedVariable as VariableInfo).name}</span>
              </div>
            )}
            {(selectedVariable as VariableInfo).is_pointer && (
              <div className="detail-row">
                <span className="detail-label">Points to:</span>
                <span className="detail-value">
                  {(selectedVariable as VariableInfo).pointer_target || 'null'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .memory-visualizer {
          display: flex;
          flex-direction: column;
          height: 100%;
          background-color: #252526;
          color: #cccccc;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 12px;
        }

        .memory-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border-bottom: 1px solid #3e3e42;
        }

        .memory-header h3 {
          margin: 0;
          font-size: 14px;
          color: #cccccc;
        }

        .memory-info {
          display: flex;
          gap: 16px;
          font-size: 11px;
          color: #969696;
        }

        .memory-tabs {
          display: flex;
          border-bottom: 1px solid #3e3e42;
        }

        .tab-button {
          padding: 8px 16px;
          border: none;
          background: none;
          color: #969696;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }

        .tab-button:hover {
          color: #cccccc;
          background-color: #2a2d2e;
        }

        .tab-button.active {
          color: #ffffff;
          border-bottom-color: #007acc;
        }

        .memory-content {
          flex: 1;
          overflow-y: auto;
        }

        .variables-panel,
        .heap-panel,
        .stack-panel {
          padding: 12px;
        }

        .empty-state {
          text-align: center;
          color: #969696;
          padding: 20px;
        }

        .variable-item,
        .heap-allocation {
          padding: 8px;
          margin-bottom: 4px;
          border: 1px solid #3e3e42;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .variable-item:hover,
        .heap-allocation:hover {
          background-color: #2a2d2e;
        }

        .variable-item.selected,
        .heap-allocation.selected {
          background-color: #094771;
          border-color: #007acc;
        }

        .heap-allocation.freed {
          opacity: 0.5;
          border-style: dashed;
        }

        .variable-header,
        .allocation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .variable-name,
        .allocation-id {
          font-weight: bold;
          color: #4ec9b0;
        }

        .variable-type,
        .allocation-size {
          color: #969696;
          font-size: 11px;
        }

        .variable-details,
        .allocation-data {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
        }

        .variable-value,
        .data-preview {
          color: #ce9178;
        }

        .variable-address,
        .allocation-address {
          color: #d16969;
        }

        .pointer-info {
          color: #4ec9b0;
          font-size: 11px;
          margin-top: 2px;
        }

        .ref-count {
          color: #969696;
          font-size: 10px;
        }

        .freed-indicator {
          color: #e74c3c;
          font-size: 10px;
          font-weight: bold;
          text-align: center;
          margin-top: 2px;
        }

        .call-stack h4 {
          margin: 0 0 12px 0;
          font-size: 13px;
          color: #cccccc;
        }

        .empty-stack {
          color: #969696;
          text-align: center;
          padding: 20px;
        }

        .stack-frames {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stack-frame {
          padding: 8px;
          border: 1px solid #3e3e42;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .stack-frame:hover {
          background-color: #2a2d2e;
        }

        .stack-frame.selected {
          background-color: #094771;
          border-color: #007acc;
        }

        .frame-function {
          font-weight: bold;
          color: #4ec9b0;
        }

        .frame-address,
        .frame-base-pointer {
          font-size: 10px;
          color: #969696;
        }

        .selected-details {
          border-top: 1px solid #3e3e42;
          padding: 12px;
        }

        .selected-details h4 {
          margin: 0 0 8px 0;
          font-size: 13px;
          color: #cccccc;
        }

        .details-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
        }

        .detail-label {
          color: #969696;
        }

        .detail-value {
          color: #cccccc;
        }
      `}</style>
    </div>
  );
};