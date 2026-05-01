import React from 'react';

export default function Controls({
  rows,
  cols,
  onRowsChange,
  onColsChange,
  onNewGame,
  onStep,
  autoRun,
  onAutoRunToggle,
  disabled,
}) {
  return (
    <div className="controls-panel">
      <h2 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>
        Controls
      </h2>

      {/* Dimension inputs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <label style={labelStyle}>
          Rows
          <input
            type="number"
            min={3}
            max={12}
            value={rows}
            onChange={e => onRowsChange(Math.max(3, Math.min(12, Number(e.target.value))))}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Columns
          <input
            type="number"
            min={3}
            max={12}
            value={cols}
            onChange={e => onColsChange(Math.max(3, Math.min(12, Number(e.target.value))))}
            style={inputStyle}
          />
        </label>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={onNewGame}
          style={{ ...btnStyle, backgroundColor: '#3b82f6' }}
        >
          🔄 New Game
        </button>

        <button
          onClick={onStep}
          disabled={disabled}
          style={{
            ...btnStyle,
            backgroundColor: disabled ? '#475569' : '#22c55e',
            cursor:          disabled ? 'not-allowed' : 'pointer',
          }}
        >
          ▶ Step
        </button>

        <button
          onClick={onAutoRunToggle}
          disabled={disabled && !autoRun}
          style={{
            ...btnStyle,
            backgroundColor: autoRun ? '#f59e0b' : '#8b5cf6',
            cursor:          (disabled && !autoRun) ? 'not-allowed' : 'pointer',
          }}
        >
          {autoRun ? '⏸ Pause' : '⚡ Auto-Run'}
        </button>
      </div>

      <p style={{ margin: '12px 0 0', fontSize: 12, color: '#94a3b8' }}>
        Grid: {rows} × {cols} &nbsp;|&nbsp; Pits ≈ 15 % of cells
      </p>
    </div>
  );
}

const labelStyle = {
  display:       'flex',
  flexDirection: 'column',
  gap:           4,
  fontSize:      13,
  color:         '#cbd5e1',
  fontWeight:    600,
};

const inputStyle = {
  width:           70,
  padding:         '5px 8px',
  borderRadius:    6,
  border:          '1px solid #475569',
  backgroundColor: '#1e293b',
  color:           '#f1f5f9',
  fontSize:        14,
};

const btnStyle = {
  padding:      '8px 16px',
  borderRadius: 8,
  border:       'none',
  color:        '#fff',
  fontSize:     14,
  fontWeight:   700,
  cursor:       'pointer',
  transition:   'opacity 0.2s',
};
