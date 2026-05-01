import React from 'react';

const STATUS_CONFIG = {
  exploring: { label: '🔍 Exploring', color: '#60a5fa' },
  won:       { label: '🏆 You Win!',  color: '#4ade80' },
  dead:      { label: '💀 Game Over', color: '#f87171' },
};

export default function MetricsDashboard({ state }) {
  if (!state) return null;

  const { position, status, inferenceSteps, percepts, moveCount } = state;

  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.exploring;

  const perceptLabel =
    percepts.breeze && percepts.stench ? 'Breeze + Stench'
    : percepts.breeze                  ? 'Breeze'
    : percepts.stench                  ? 'Stench'
    :                                    'None';

  return (
    <div className="metrics-panel">
      <h2 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>
        Metrics
      </h2>

      <MetricRow label="Status">
        <span style={{ color: statusCfg.color, fontWeight: 700 }}>{statusCfg.label}</span>
      </MetricRow>

      <MetricRow label="Position">
        ({position.r}, {position.c})
      </MetricRow>

      <MetricRow label="Moves">{moveCount}</MetricRow>

      <MetricRow label="Percepts">
        <span
          style={{
            color:
              percepts.breeze || percepts.stench ? '#fbbf24' : '#94a3b8',
          }}
        >
          {perceptLabel}
        </span>
      </MetricRow>

      <MetricRow label="Inference Steps">
        <span style={{ color: '#a78bfa', fontWeight: 700 }}>
          {inferenceSteps.toLocaleString()}
        </span>
      </MetricRow>

      {/* Status banner */}
      {status !== 'exploring' && (
        <div
          style={{
            marginTop:       16,
            padding:         '10px 14px',
            borderRadius:    8,
            backgroundColor: status === 'won' ? '#14532d' : '#450a0a',
            border:          `1px solid ${statusCfg.color}`,
            textAlign:       'center',
            fontSize:        16,
            fontWeight:      700,
            color:           statusCfg.color,
          }}
        >
          {status === 'won'
            ? '🏆 All safe cells explored!'
            : '💀 Agent encountered a hazard!'}
        </div>
      )}
    </div>
  );
}

function MetricRow({ label, children }) {
  return (
    <div
      style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        padding:        '6px 0',
        borderBottom:   '1px solid #334155',
        fontSize:       14,
        color:          '#cbd5e1',
      }}
    >
      <span style={{ color: '#94a3b8', fontWeight: 600 }}>{label}</span>
      <span>{children}</span>
    </div>
  );
}
